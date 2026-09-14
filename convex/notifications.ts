import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── Notification preferences (FR25–27) ──
// Stored per user in the notificationPreferences table.
// Actual scheduling happens client-side with expo-notifications.

export const getPreferences = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (existing) {
      return {
        sessionReminders: existing.sessionReminders,
        deadlineReminders: existing.deadlineReminders,
        sessionLeadMinutes: existing.sessionLeadMinutes,
        deadlineLeadHours: existing.deadlineLeadHours,
        quietHoursStart: existing.quietHoursStart,
        quietHoursEnd: existing.quietHoursEnd,
      };
    }

    // Return defaults
    return {
      sessionReminders: true,
      deadlineReminders: true,
      sessionLeadMinutes: 15,
      deadlineLeadHours: 24,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
  },
});

// ── Save notification preferences ──
export const savePreferences = mutation({
  args: {
    userId: v.id('users'),
    sessionReminders: v.boolean(),
    deadlineReminders: v.boolean(),
    sessionLeadMinutes: v.number(),
    deadlineLeadHours: v.number(),
    quietHoursStart: v.string(),
    quietHoursEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sessionReminders: args.sessionReminders,
        deadlineReminders: args.deadlineReminders,
        sessionLeadMinutes: args.sessionLeadMinutes,
        deadlineLeadHours: args.deadlineLeadHours,
        quietHoursStart: args.quietHoursStart,
        quietHoursEnd: args.quietHoursEnd,
      });
    } else {
      await ctx.db.insert('notificationPreferences', {
        userId: args.userId,
        sessionReminders: args.sessionReminders,
        deadlineReminders: args.deadlineReminders,
        sessionLeadMinutes: args.sessionLeadMinutes,
        deadlineLeadHours: args.deadlineLeadHours,
        quietHoursStart: args.quietHoursStart,
        quietHoursEnd: args.quietHoursEnd,
      });
    }
  },
});

// ── Get upcoming reminders for a user ──
export const getUpcomingReminders = query({
  args: {
    userId: v.id('users'),
    fromTime: v.number(),
  },
  handler: async (ctx, args) => {
    const now = new Date(args.fromTime);
    const in48h = new Date(args.fromTime + 48 * 60 * 60 * 1000);
    const nowStr = now.toISOString().split('T')[0];
    const in48hStr = in48h.toISOString().split('T')[0];

    const todayDay = now.getDay();
    const tomorrowDay = (todayDay + 1) % 7;

    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const relevantSessions = sessions.filter(
      (s) => s.dayOfWeek === todayDay || s.dayOfWeek === tomorrowDay
    );

    const deadlines = await ctx.db
      .query('deadlines')
      .withIndex('by_user_date', (q) =>
        q
          .eq('userId', args.userId)
          .gte('dueDate', nowStr)
          .lte('dueDate', in48hStr)
      )
      .collect();

    return {
      sessions: relevantSessions,
      deadlines: deadlines.filter((d: any) => !d.completed),
    };
  },
});
