import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── List today's focus sessions ──
export const listToday = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    return ctx.db
      .query('focusSessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
      .then((sessions) =>
        sessions.filter((s) => s.startedAt >= todayMs)
      );
  },
});

// ── Get today's stats ──
export const todayStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const sessions = await ctx.db
      .query('focusSessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
      .then((s) => s.filter((sess) => sess.startedAt >= todayMs));

    const completed = sessions.filter((s) => s.completed);
    const totalMinutes = completed.reduce((sum, s) => sum + s.durationMinutes, 0);
    const pomodoroCount = completed.filter((s) => s.type === 'pomodoro').length;

    return {
      totalMinutes,
      pomodoroCount,
      sessionCount: completed.length,
    };
  },
});

// ── Start a focus session ──
export const start = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.optional(v.id('courses')),
    type: v.union(
      v.literal('pomodoro'),
      v.literal('shortBreak'),
      v.literal('longBreak'),
      v.literal('free')
    ),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('focusSessions', {
      userId: args.userId,
      courseId: args.courseId,
      type: args.type,
      durationMinutes: args.durationMinutes,
      startedAt: Date.now(),
      completed: false,
    });
  },
});

// ── Complete a focus session ──
export const complete = mutation({
  args: { sessionId: v.id('focusSessions') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      completed: true,
      completedAt: Date.now(),
    });
  },
});

// ── Cancel a focus session ──
export const cancel = mutation({
  args: { sessionId: v.id('focusSessions') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId);
  },
});
