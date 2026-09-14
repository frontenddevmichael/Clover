import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── Create semester (FR14) ──
export const create = mutation({
  args: {
    userId: v.id('users'),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    examStart: v.optional(v.string()),
    examEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('semesters', args);
  },
});

// ── List semesters for a user ──
export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('semesters')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// ── Update semester (FR15 — pause/shift) ──
export const update = mutation({
  args: {
    id: v.id('semesters'),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    examStart: v.optional(v.string()),
    examEnd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value;
    }
    await ctx.db.patch(id, updates);
  },
});

// ── Delete semester ──
export const remove = mutation({
  args: { id: v.id('semesters') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Get active semester (current date within start/end) ──
export const getActive = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];
    const semesters = await ctx.db
      .query('semesters')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
    return semesters.find(
      (s) => today >= s.startDate && today <= s.endDate
    ) ?? null;
  },
});

// ── Check if a date falls within exam period (FR16) ──
export const isExamPeriod = query({
  args: {
    userId: v.id('users'),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const semesters = await ctx.db
      .query('semesters')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
    return semesters.some(
      (s) =>
        s.examStart &&
        s.examEnd &&
        args.date >= s.examStart &&
        args.date <= s.examEnd
    );
  },
});

// ── Bulk-reschedule recurring sessions for a semester shift (FR15) ──
// This is a client-side operation — the client adjusts dayOfWeek/startTime
// and calls sessions.update in a batch. This function is a helper to
// shift all sessions for a user by a number of days.
export const bulkShiftSessions = mutation({
  args: {
    userId: v.id('users'),
    dayOffset: v.number(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
    for (const session of sessions) {
      if (session.isRecurring) {
        const newDay = ((session.dayOfWeek + args.dayOffset) % 7 + 7) % 7;
        await ctx.db.patch(session._id, { dayOfWeek: newDay });
      }
    }
  },
});
