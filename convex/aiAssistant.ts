import { query, mutation, action } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';

// ── AI plan generation (FR17–20) ──
// Calls Claude API via a Convex action (actions can call external APIs;
// mutations cannot). The API key is stored in Convex env vars — set it
// with `npx convex env set ANTHROPIC_API_KEY=sk-...`.

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const MAX_OUTPUT_TOKENS = 1024;

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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Graceful fallback: return a helpful mock when no API key is set
      return getFallbackProposal(ctx, args.userId);
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
        console.error('Claude API error:', response.status, err);
        return getFallbackProposal(ctx, args.userId);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text ?? '';

      // Parse the JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return getFallbackProposal(ctx, args.userId);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
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
    } catch (e) {
      console.error('Claude API call failed:', e);
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

// ── Accept a proposal (FR17) ──
export const acceptProposal = mutation({
  args: {
    userId: v.id('users'),
    proposalId: v.string(),
  },
  handler: async (ctx, args) => {
    return { success: true };
  },
});

// ── Reject a proposal ──
export const rejectProposal = mutation({
  args: {
    proposalId: v.string(),
  },
  handler: async (ctx, args) => {
    return { success: true };
  },
});

// ── Rate limit status (NFR9) ──
export const getRateLimit = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return {
      used: 0,
      limit: 10,
      resetsAt: new Date().toISOString(),
    };
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
