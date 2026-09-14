import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── AI plan generation (FR17–20) ──
// This is a placeholder. The actual Claude API call will be
// implemented as a Convex HTTP action in production.

export const generatePlan = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Gather user data
    const courses = await ctx.db
      .query('courses')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const deadlines = await ctx.db
      .query('deadlines')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Build context for Claude
    const context = {
      courses: courses.map((c) => ({
        code: c.code,
        title: c.title,
      })),
      sessions: sessions.map((s) => ({
        courseCode: courses.find((c) => c._id === s.courseId)?.code,
        type: s.type,
        day: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isRecurring: s.isRecurring,
      })),
      deadlines: deadlines
        .filter((d) => !d.completed)
        .map((d) => ({
          courseCode: courses.find((c) => c._id === d.courseId)?.code,
          title: d.title,
          type: d.type,
          dueDate: d.dueDate,
          dueTime: d.dueTime,
        })),
    };

    // TODO: Call Claude API via Convex HTTP action
    // For now, return a mock proposal
    return {
      proposalId: `plan_${Date.now()}`,
      explanation:
        'Based on your current schedule, I suggest adding a 2-hour revision session for MTH201 on Thursday afternoon, since your exam is next week and you have no sessions that day.',
      changes: [
        {
          // The client renders '+' for 'add' and '→' for anything else
          action: 'add',
          courseCode: context.courses[0]?.code || 'UNKNOWN',
          type: 'revision',
          dayOfWeek: 4,
          startTime: '14:00',
          endTime: '16:00',
        },
      ],
      status: 'proposed' as const,
    };
  },
});

// ── Re-propose when something changes (FR18) ──
export const repropose = mutation({
  args: {
    userId: v.id('users'),
    changeDescription: v.string(),
  },
  handler: async (ctx, args) => {
    // Similar to generatePlan but with change context
    return {
      proposalId: `replan_${Date.now()}`,
      explanation: `After "${args.changeDescription}", I've adjusted your schedule accordingly.`,
      changes: [],
      status: 'proposed' as const,
    };
  },
});

// ── Accept a proposal ──
export const acceptProposal = mutation({
  args: {
    userId: v.id('users'),
    proposalId: v.string(),
  },
  handler: async (ctx, args) => {
    // Apply the proposal changes to the user's sessions
    // For now, just return success
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

// ── Get rate limit status (NFR9) ──
export const getRateLimit = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // In production, track usage in a table
    return {
      used: 0,
      limit: 10,
      resetsAt: new Date().toISOString(),
    };
  },
});
