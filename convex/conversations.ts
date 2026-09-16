// Conversation history — stores AI chat messages for context across sessions.
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

const MAX_HISTORY = 20; // keep last N messages for context

// ── List recent conversation history ──
export const listRecent = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('conversations')
      .withIndex('by_user_time', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(MAX_HISTORY);

    return messages.reverse(); // oldest first
  },
});

// ── Save a message ──
export const saveMessage = mutation({
  args: {
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('conversations', {
      userId: args.userId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

// ── Clear conversation history ──
export const clearHistory = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('conversations')
      .withIndex('by_user_time', (q) => q.eq('userId', args.userId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});
