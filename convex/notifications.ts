import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── Notification preferences (FR25–27) ──
// Stored per user, synced with Convex.
// Actual scheduling happens client-side with expo-notifications.

export const getPreferences = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // For now, return defaults. Preferences will be stored in a
    // notifications table when we add settings UI in Phase 5.
    return {
      sessionLeadMinutes: 15, // reminder 15 min before session
      deadlineLeadHours: 24,  // reminder 24h before deadline
      finalDeadlineLeadHours: 48, // automatic reminder in final 48h (FR26)
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
  },
});

// ── Get upcoming reminders for a user ──
// Returns sessions and deadlines that need reminders in the next 48 hours
export const getUpcomingReminders = query({
  args: {
    userId: v.id('users'),
    fromTime: v.number(), // epoch ms
  },
  handler: async (ctx, args) => {
    const now = new Date(args.fromTime);
    const in48h = new Date(args.fromTime + 48 * 60 * 60 * 1000);
    const nowStr = now.toISOString().split('T')[0];
    const in48hStr = in48h.toISOString().split('T')[0];

    // Get sessions for today and tomorrow
    const todayDay = now.getDay();
    const tomorrowDay = (todayDay + 1) % 7;

    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const relevantSessions = sessions.filter(
      (s) => s.dayOfWeek === todayDay || s.dayOfWeek === tomorrowDay
    );

    // Get deadlines within 48 hours
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
      deadlines: deadlines.filter((d) => !d.completed),
    };
  },
});
