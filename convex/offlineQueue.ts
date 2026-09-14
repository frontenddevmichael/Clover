import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// ── Enqueue an offline write (FR28) ──
export const enqueue = mutation({
  args: {
    userId: v.id('users'),
    collection: v.string(),
    documentId: v.optional(v.string()),
    operation: v.union(
      v.literal('insert'),
      v.literal('patch'),
      v.literal('delete')
    ),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('offlineQueue', {
      ...args,
      createdAt: Date.now(),
      synced: false,
    });
  },
});

// ── Get pending items for a user (FR29) ──
export const getPending = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('offlineQueue')
      .withIndex('by_user_synced', (q) =>
        q.eq('userId', args.userId).eq('synced', false)
      )
      .collect();
  },
});

// ── Mark an item as synced (FR29) ──
export const markSynced = mutation({
  args: { id: v.id('offlineQueue') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { synced: true });
  },
});

// ── Clear all synced items for a user ──
export const clearSynced = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const synced = await ctx.db
      .query('offlineQueue')
      .withIndex('by_user_synced', (q) =>
        q.eq('userId', args.userId).eq('synced', true)
      )
      .collect();
    for (const item of synced) await ctx.db.delete(item._id);
  },
});
