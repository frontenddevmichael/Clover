import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── List deadlines for a user by date range (FR11) ──
export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('deadlines')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// ── List upcoming deadlines (FR11) ──
export const listUpcoming = query({
  args: {
    userId: v.id('users'),
    fromDate: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query('deadlines')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', args.userId).gte('dueDate', args.fromDate)
      )
      .collect();
  },
});

// ── Create a deadline (FR10) ──
export const create = mutation({
  args: {
    userId: v.id('users'),
    courseId: v.id('courses'),
    title: v.string(),
    type: v.union(
      v.literal('assignment'),
      v.literal('ca'),
      v.literal('exam')
    ),
    dueDate: v.string(),
    dueTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('deadlines', {
      ...args,
      completed: false,
    });
  },
});

// ── Update a deadline (FR7) ──
export const update = mutation({
  args: {
    id: v.id('deadlines'),
    title: v.optional(v.string()),
    type: v.optional(
      v.union(v.literal('assignment'), v.literal('ca'), v.literal('exam'))
    ),
    dueDate: v.optional(v.string()),
    dueTime: v.optional(v.string()),
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

// ── Mark deadline complete (FR13) ──
export const markComplete = mutation({
  args: { id: v.id('deadlines') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { completed: true });
  },
});

// ── Delete a deadline (FR7) ──
export const remove = mutation({
  args: { id: v.id('deadlines') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
