import { query, mutation, action } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';

// Convex actions have process.env at runtime but TS needs the declaration
declare const process: { env: { [key: string]: string | undefined } };

// ── AI plan generation (FR17–20) ──
// Calls Claude API via a Convex action (actions can call external APIs;
// mutations cannot). The API key is stored in Convex env vars — set it
// with `npx convex env set ANTHROPIC_API_KEY=sk-...`.

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_OUTPUT_TOKENS = 1024;
const RATE_LIMIT = 10; // per user per day (NFR9)

// Simple hash for input caching (NFR10)
function hashInput(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h${Math.abs(hash).toString(36)}`;
}

function buildPrompt(courses: any[], sessions: any[], deadlines: any[]) {
  const courseList = courses.map((c) => `- ${c.code}: ${c.title}`).join('\n');
  const sessionList = sessions
    .map((s) => {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `- ${s.courseCode} ${s.type} ${dayNames[s.day]} ${s.startTime}–${s.endTime}`;
    })
    .join('\n');
  const deadlineList = deadlines
    .map((d) => `- ${d.courseCode} ${d.title} (${d.type}) due ${d.dueDate}${d.dueTime ? ' ' + d.dueTime : ''}`)
    .join('\n');

  return `You are a study planner assistant for a Nigerian university student.

COURSES:
${courseList || '(none yet)'}

WEEKLY SESSIONS:
${sessionList || '(none yet)'}

UPCOMING DEADLINES:
${deadlineList || '(none yet)'}

Based on this data, propose a realistic weekly study plan. Consider:
- Spacing out study sessions for the same course
- Placing revision close to deadlines
- Not overloading any single day
- Including break time between sessions

Respond with ONLY valid JSON (no markdown, no explanation outside the JSON):
{
  "explanation": "A brief 1-2 sentence explanation of your reasoning",
  "changes": [
    {
      "action": "add" | "modify" | "remove",
      "courseCode": "MTH201",
      "type": "revision" | "study" | "tutorial",
      "dayOfWeek": 0-6 (0=Sunday),
      "startTime": "HH:MM",
      "endTime": "HH:MM"
    }
  ]
}

If the schedule looks fine as-is, return an empty changes array with a positive explanation.`;
}

// ── Generate plan (FR17) ──
export const generatePlan = action({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // ── Rate limit check (NFR9) ──
    const today = new Date().toISOString().split('T')[0];
    const rateRecord = await ctx.runQuery(api.aiAssistant.getRateLimit, { userId: args.userId });
    if (rateRecord.used >= RATE_LIMIT) {
      return {
        proposalId: '',
        explanation: `You've used all ${RATE_LIMIT} AI plan requests today. Try again tomorrow.`,
        changes: [],
        status: 'rate_limited' as const,
      };
    }

    // Gather user data via internal queries (actions can call queries)
    const courses = await ctx.runQuery(api.courses.listByUser, { userId: args.userId });
    const sessions = await ctx.runQuery(api.sessions.listByUser, { userId: args.userId });
    const deadlines = await ctx.runQuery(api.deadlines.listUpcoming, {
      userId: args.userId,
      fromDate: new Date().toISOString().split('T')[0],
    });

    const courseMap = Object.fromEntries(courses.map((c: any) => [c._id, c]));
    const sessionData = sessions.map((s: any) => ({
      courseCode: courseMap[s.courseId]?.code ?? '???',
      type: s.type,
      day: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    const deadlineData = deadlines
      .filter((d: any) => !d.completed)
      .map((d: any) => ({
        courseCode: courseMap[d.courseId]?.code ?? '???',
        title: d.title,
        type: d.type,
        dueDate: d.dueDate,
        dueTime: d.dueTime,
      }));

    // ── Check proposal cache (NFR10) ──
    const inputStr = JSON.stringify({ sessions: sessionData, deadlines: deadlineData });
    const inputHash = hashInput(inputStr);
    const cached: any = await ctx.runQuery(api.aiAssistant.getCachedProposal, { userId: args.userId, inputHash });
    if (cached) {
      // Still count against rate limit for cache hits
      await ctx.runMutation(api.aiAssistant.incrementRateLimit, { userId: args.userId, date: today });
      return cached;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(api.aiAssistant.incrementRateLimit, { userId: args.userId, date: today });
      return getFallbackProposal(ctx, args.userId);
    }

    const prompt = buildPrompt(courses, sessionData, deadlineData);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        await ctx.runMutation(api.aiAssistant.incrementRateLimit, { userId: args.userId, date: today });
        return getFallbackProposal(ctx, args.userId);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const proposal = {
        proposalId: `plan_${Date.now()}`,
        explanation: parsed.explanation || 'Here are my suggestions for your week.',
        changes: (parsed.changes || []).map((c: any) => ({
          action: c.action || 'add',
          courseCode: c.courseCode || '???',
          type: c.type || 'study',
          dayOfWeek: typeof c.dayOfWeek === 'number' ? c.dayOfWeek : 1,
          startTime: c.startTime || '14:00',
          endTime: c.endTime || '16:00',
        })),
        status: 'proposed' as const,
      };

      // Cache the proposal (NFR10) and increment rate limit (NFR9)
      await ctx.runMutation(api.aiAssistant.cacheProposal, { userId: args.userId, inputHash, proposal });
      await ctx.runMutation(api.aiAssistant.incrementRateLimit, { userId: args.userId, date: today });
      return proposal;
    } catch {
      await ctx.runMutation(api.aiAssistant.incrementRateLimit, { userId: args.userId, date: today });
      return getFallbackProposal(ctx, args.userId);
    }
  },
});

// ── Re-propose (FR18) ──
export const repropose = action({
  args: {
    userId: v.id('users'),
    changeDescription: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        proposalId: `replan_${Date.now()}`,
        explanation: `After "${args.changeDescription}", I'd adjust your schedule — but I need an API key to generate a real plan.`,
        changes: [],
        status: 'proposed' as const,
      };
    }

    const courses = await ctx.runQuery(api.courses.listByUser, { userId: args.userId });
    const sessions = await ctx.runQuery(api.sessions.listByUser, { userId: args.userId });
    const deadlines = await ctx.runQuery(api.deadlines.listUpcoming, {
      userId: args.userId,
      fromDate: new Date().toISOString().split('T')[0],
    });

    const courseMap = Object.fromEntries(courses.map((c: any) => [c._id, c]));
    const sessionData = sessions.map((s: any) => ({
      courseCode: courseMap[s.courseId]?.code ?? '???',
      type: s.type,
      day: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    const deadlineData = deadlines
      .filter((d: any) => !d.completed)
      .map((d: any) => ({
        courseCode: courseMap[d.courseId]?.code ?? '???',
        title: d.title,
        type: d.type,
        dueDate: d.dueDate,
        dueTime: d.dueTime,
      }));

    const prompt = `${buildPrompt(courses, sessionData, deadlineData)}

IMPORTANT CHANGE: ${args.changeDescription}

Adjust the plan to account for this change. Respond with the same JSON format.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        return getFallbackProposal(ctx, args.userId);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return getFallbackProposal(ctx, args.userId);

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        proposalId: `replan_${Date.now()}`,
        explanation: parsed.explanation || `Adjusted for: ${args.changeDescription}`,
        changes: (parsed.changes || []).map((c: any) => ({
          action: c.action || 'add',
          courseCode: c.courseCode || '???',
          type: c.type || 'study',
          dayOfWeek: typeof c.dayOfWeek === 'number' ? c.dayOfWeek : 1,
          startTime: c.startTime || '14:00',
          endTime: c.endTime || '16:00',
        })),
        status: 'proposed' as const,
      };
    } catch {
      return getFallbackProposal(ctx, args.userId);
    }
  },
});

// ── Accept a proposal — apply its changes (FR17) ──
export const acceptProposal = mutation({
  args: {
    userId: v.id('users'),
    proposalId: v.string(),
    changes: v.array(
      v.object({
        action: v.string(),
        courseCode: v.string(),
        type: v.string(),
        dayOfWeek: v.number(),
        startTime: v.string(),
        endTime: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const courses = await ctx.db
      .query('courses')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const courseMap = new Map(courses.map((c) => [c.code, c._id]));

    for (const change of args.changes) {
      const courseId = courseMap.get(change.courseCode);
      if (!courseId) continue;

      if (change.action === 'add') {
        await ctx.db.insert('sessions', {
          userId: args.userId,
          courseId,
          type: change.type as any,
          dayOfWeek: change.dayOfWeek,
          startTime: change.startTime,
          endTime: change.endTime,
          isRecurring: true,
          recurrencePattern: 'weekly',
        });
      }
    }

    // Mark the proposal as accepted in the cache
    const record = await ctx.db
      .query('aiProposals')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .first();
    if (record && record.proposal.proposalId === args.proposalId) {
      await ctx.db.patch(record._id, {
        proposal: { ...record.proposal, status: 'accepted' },
      });
    }

    return { success: true, applied: args.changes.filter((c) => c.action === 'add').length };
  },
});

// ── Reject a proposal ──
export const rejectProposal = mutation({
  args: {
    userId: v.id('users'),
    proposalId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('aiProposals')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .first();
    if (record && record.proposal.proposalId === args.proposalId) {
      await ctx.db.patch(record._id, {
        proposal: { ...record.proposal, status: 'rejected' },
      });
    }
    return { success: true };
  },
});

// ── Rate limit status (NFR9) ──
export const getRateLimit = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    const record = await ctx.db
      .query('aiRateLimits')
      .withIndex('by_user_date', (q) => q.eq('userId', args.userId).eq('date', today))
      .unique();
    return {
      used: record?.count ?? 0,
      limit: RATE_LIMIT,
      resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  },
});

// ── Increment rate limit counter (NFR9) ──
export const incrementRateLimit = mutation({
  args: { userId: v.id('users'), date: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('aiRateLimits')
      .withIndex('by_user_date', (q) => q.eq('userId', args.userId).eq('date', args.date))
      .unique();
    if (record) {
      await ctx.db.patch(record._id, { count: record.count + 1 });
    } else {
      await ctx.db.insert('aiRateLimits', { userId: args.userId, date: args.date, count: 1 });
    }
  },
});

// ── Cache a proposal (NFR10) ──
export const cacheProposal = mutation({
  args: { userId: v.id('users'), inputHash: v.string(), proposal: v.any() },
  handler: async (ctx, args) => {
    // Upsert: delete old cache for this hash, insert new
    const existing = await ctx.db
      .query('aiProposals')
      .withIndex('by_user_hash', (q) => q.eq('userId', args.userId).eq('inputHash', args.inputHash))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { proposal: args.proposal, createdAt: Date.now() });
    } else {
      await ctx.db.insert('aiProposals', { userId: args.userId, inputHash: args.inputHash, proposal: args.proposal, createdAt: Date.now() });
    }
  },
});

// ── Get cached proposal (NFR10) ──
export const getCachedProposal = query({
  args: { userId: v.id('users'), inputHash: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('aiProposals')
      .withIndex('by_user_hash', (q) => q.eq('userId', args.userId).eq('inputHash', args.inputHash))
      .unique();
    if (!record) return null;
    // Cache expires after 1 hour
    if (Date.now() - record.createdAt > 60 * 60 * 1000) return null;
    return record.proposal;
  },
});

// ── Fallback when no API key is set ──

// ── Freeform chat with conversation context (FR17-20) ──
export const chat = action({
  args: {
    userId: v.id('users'),
    message: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Save user message
    await ctx.runMutation(api.conversations.saveMessage, {
      userId: args.userId,
      role: 'user',
      content: args.message,
    });

    // Gather context
    const courses: any[] = await ctx.runQuery(api.courses.listByUser, { userId: args.userId });
    const sessions: any[] = await ctx.runQuery(api.sessions.listByUser, { userId: args.userId });
    const deadlines: any[] = await ctx.runQuery(api.deadlines.listUpcoming, {
      userId: args.userId,
      fromDate: new Date().toISOString().split('T')[0],
    });
    const history: any[] = await ctx.runQuery(api.conversations.listRecent, { userId: args.userId });
    const user: any = await ctx.runQuery(api.users.getById, { userId: args.userId });

    const courseMap = Object.fromEntries(courses.map((c: any) => [c._id, c]));
    const sessionData = sessions.map((s: any) => ({
      courseCode: courseMap[s.courseId]?.code ?? '???',
      type: s.type,
      day: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    const deadlineData = deadlines
      .filter((d: any) => !d.completed)
      .map((d: any) => ({
        courseCode: courseMap[d.courseId]?.code ?? '???',
        title: d.title,
        type: d.type,
        dueDate: d.dueDate,
        dueTime: d.dueTime,
      }));

    // Build conversation history for Claude
    const conversationHistory = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const systemPrompt = `You are Clover, a study planner assistant for a Nigerian university student named ${user?.name ?? 'the user'}.

STUDENT INFO:
- Institution: ${user?.institution ?? 'Not set'}
- Department: ${user?.department ?? 'Not set'}
- Level: ${user?.level ?? 'Not set'} level

COURSES:
${courses.map((c: any) => `- ${c.code}: ${c.title}`).join('\n') || '(none yet)'}

WEEKLY SESSIONS:
${sessionData.map((s: any) => `- ${s.courseCode} ${s.type} ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.day]} ${s.startTime}–${s.endTime}`).join('\n') || '(none yet)'}

UPCOMING DEADLINES:
${deadlineData.map((d: any) => `- ${d.courseCode} ${d.title} (${d.type}) due ${d.dueDate}${d.dueTime ? ' ' + d.dueTime : ''}`).join('\n') || '(none yet)'}

You can help with:
- Study planning and schedule optimization
- Answering questions about their timetable
- Suggesting when to study for upcoming deadlines
- General academic advice for Nigerian universities

Be concise, friendly, and practical. Use their actual course data when relevant.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const reply: string = `I'd love to help, but I need an API key to respond intelligently. Your courses: ${courses.map((c: any) => c.code).join(', ') || 'none yet'}. Set it with \`npx convex env set ANTHROPIC_API_KEY=sk-...\``;
      await ctx.runMutation(api.conversations.saveMessage, {
        userId: args.userId,
        role: 'assistant',
        content: reply,
      });
      return reply;
    }

    try {
      const messages = [
        ...conversationHistory.slice(-10), // last 10 messages for context
        { role: 'user' as const, content: args.message },
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 512,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const reply: string = data.content?.[0]?.text ?? "I couldn't generate a response. Please try again.";

      // Save assistant reply
      await ctx.runMutation(api.conversations.saveMessage, {
        userId: args.userId,
        role: 'assistant',
        content: reply,
      });

      return reply;
    } catch {
      const reply: string = "Sorry, I'm having trouble connecting. Please try again later.";
      await ctx.runMutation(api.conversations.saveMessage, {
        userId: args.userId,
        role: 'assistant',
        content: reply,
      });
      return reply;
    }
  },
});

// ── Fallback when no API key is set ──
async function getFallbackProposal(ctx: any, userId: any): Promise<{
  proposalId: string;
  explanation: string;
  changes: Array<{
    action: string;
    courseCode: string;
    type: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  status: 'proposed';
}> {
  const courses = await ctx.runQuery(api.courses.listByUser, { userId });
  const sessions = await ctx.runQuery(api.sessions.listByUser, { userId });

  if (!courses || courses.length === 0) {
    return {
      proposalId: `plan_${Date.now()}`,
      explanation: 'Add some courses and sessions first, then I can help plan your week.',
      changes: [],
      status: 'proposed' as const,
    };
  }

  // Simple heuristic: find days with no sessions and suggest adding study time
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysWithSessions = new Set(sessions?.map((s: any) => s.dayOfWeek) ?? []);
  const emptyDays = [1, 2, 3, 4, 5].filter((d) => !daysWithSessions.has(d));

  const changes = [];
  if (emptyDays.length > 0 && courses.length > 0) {
    const targetDay = emptyDays[0];
    changes.push({
      action: 'add',
      courseCode: courses[0].code,
      type: 'revision',
      dayOfWeek: targetDay,
      startTime: '14:00',
      endTime: '16:00',
    });
  }

  return {
    proposalId: `plan_${Date.now()}`,
    explanation:
      changes.length > 0
        ? `I noticed ${dayNames[emptyDays[0]]} is free — consider adding a study session for ${courses[0].code}. Set an API key for smarter plans.`
        : 'Your week looks well-structured! Set an API key for AI-powered suggestions.',
    changes,
    status: 'proposed' as const,
  };
}
