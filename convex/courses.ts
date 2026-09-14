import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── List courses for a user (FR4) ──
export const listByUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('courses')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// ── Create a course (FR4) ──
export const create = mutation({
  args: {
    userId: v.id('users'),
    code: v.string(),
    title: v.string(),
    color: v.string(),
    semesterId: v.optional(v.id('semesters')),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('courses', args);
  },
});

// ── Update a course (FR7) ──
export const update = mutation({
  args: {
    id: v.id('courses'),
    code: v.optional(v.string()),
    title: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    if (fields.code !== undefined) updates.code = fields.code;
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.color !== undefined) updates.color = fields.color;
    await ctx.db.patch(id, updates);
  },
});

// ── Delete a course and its sessions/deadlines (FR7) ──
export const remove = mutation({
  args: { id: v.id('courses') },
  handler: async (ctx, args) => {
    // Cascade: delete sessions and deadlines tied to this course
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_course', (q) => q.eq('courseId', args.id))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);

    const deadlines = await ctx.db
      .query('deadlines')
      .withIndex('by_course', (q) => q.eq('courseId', args.id))
      .collect();
    for (const d of deadlines) await ctx.db.delete(d._id);

    await ctx.db.delete(args.id);
  },
});
