import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── Get a single session (edit sheet prefill) ──
export const getById = query({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// ── List sessions for a user by day of week (FR9) ──
export const listByUserAndDay = query({
  args: {
    userId: v.id('users'),
    dayOfWeek: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query('sessions')
      .withIndex('by_user_day', (q) =>
        q.eq('userId', args.userId).eq('dayOfWeek', args.dayOfWeek)
      )
      .collect();
  },
});

// ── List all sessions for a user (FR9 — week view) ──
export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// ── Create a recurring session (FR5) ──
export const createRecurring = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.id('courses'),
    type: v.union(
      v.literal('lecture'),
      v.literal('lab'),
      v.literal('tutorial'),
      v.literal('study'),
      v.literal('revision')
    ),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    recurrencePattern: v.union(
      v.literal('weekly'),
      v.literal('biweekly'),
      v.literal('custom')
    ),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('sessions', {
      ...args,
      isRecurring: true,
    });
  },
});

// ── Create a one-off session (FR6) ──
export const createOneOff = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.id('courses'),
    type: v.union(
      v.literal('lecture'),
      v.literal('lab'),
      v.literal('tutorial'),
      v.literal('study'),
      v.literal('revision')
    ),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('sessions', {
      ...args,
      isRecurring: false,
      dayOfWeek: new Date(args.date).getDay(),
    });
  },
});

// ── Update a session (FR7) ──
export const update = mutation({
  args: {
    id: v.id('sessions'),
    courseId: v.optional(v.id('courses')),
    type: v.optional(
      v.union(
        v.literal('lecture'),
        v.literal('lab'),
        v.literal('tutorial'),
        v.literal('study'),
        v.literal('revision')
      )
    ),
    dayOfWeek: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    date: v.optional(v.string()),
    recurrencePattern: v.optional(
      v.union(v.literal('weekly'), v.literal('biweekly'), v.literal('custom'))
    ),
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

// ── Delete a session (FR7) ──
export const remove = mutation({
  args: { id: v.id('sessions') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ── Pause or resume all recurring sessions for a user (FR15) ──
export const pauseAllSessions = mutation({
  args: {
    userId: v.id('users'),
    paused: v.boolean(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    for (const session of sessions) {
      if (session.isRecurring) {
        await ctx.db.patch(session._id, { paused: args.paused });
      }
    }
  },
});

// ── Detect overlapping sessions for a user on a given day (FR8) ──
export const detectOverlaps = query({
  args: {
    userId: v.id('users'),
    dayOfWeek: v.number(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_day', (q) =>
        q.eq('userId', args.userId).eq('dayOfWeek', args.dayOfWeek)
      )
      .collect();

    const overlaps: Array<{ a: string; b: string }> = [];
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const a = sessions[i];
        const b = sessions[j];
        if (timeOverlaps(a.startTime, a.endTime, b.startTime, b.endTime)) {
          overlaps.push({ a: a._id, b: b._id });
        }
      }
    }
    return overlaps;
  },
});

function timeOverlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const aStart = toMin(startA);
  const aEnd = toMin(endA);
  const bStart = toMin(startB);
  const bEnd = toMin(endB);
  return aStart < bEnd && bStart < aEnd;
}
