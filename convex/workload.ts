import { query } from './_generated/server';
import { v } from 'convex/values';

// ── Workload calculation (FR12) ──
// Returns workload level per day and per week based on scheduled time
// and deadline density.

type WorkloadLevel = 'light' | 'balanced' | 'heavy' | 'overloaded';

interface DayWorkload {
  dayOfWeek: number;
  sessionCount: number;
  totalMinutes: number;
  deadlineCount: number;
  level: WorkloadLevel;
}

interface WeekWorkload {
  totalSessions: number;
  totalMinutes: number;
  totalDeadlines: number;
  level: WorkloadLevel;
  days: DayWorkload[];
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function classifyWorkload(
  sessionMinutes: number,
  deadlineCount: number
): WorkloadLevel {
  // Combined score: sessions contribute time, deadlines add pressure
  const score = sessionMinutes / 60 + deadlineCount * 45;
  if (score <= 60) return 'light';
  if (score <= 150) return 'balanced';
  if (score <= 240) return 'heavy';
  return 'overloaded';
}

// ── Get workload for a specific day (FR12) ──
export const getDayWorkload = query({
  args: {
    userId: v.id('users'),
    dayOfWeek: v.number(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user_day', (q) =>
        q.eq('userId', args.userId).eq('dayOfWeek', args.dayOfWeek)
      )
      .collect();

    const deadlines = await ctx.db
      .query('deadlines')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', args.userId).eq('dueDate', args.date)
      )
      .collect();

    const totalMinutes = sessions.reduce((sum, s) => {
      return sum + (toMinutes(s.endTime) - toMinutes(s.startTime));
    }, 0);

    const level = classifyWorkload(totalMinutes, deadlines.length);

    return {
      dayOfWeek: args.dayOfWeek,
      sessionCount: sessions.length,
      totalMinutes,
      deadlineCount: deadlines.length,
      level,
    };
  },
});

// ── Get workload for the full week (FR12) ──
export const getWeekWorkload = query({
  args: {
    userId: v.id('users'),
    weekStartDate: v.string(), // "YYYY-MM-DD" of Sunday
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const allDeadlines = await ctx.db
      .query('deadlines')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const weekStart = new Date(args.weekStartDate);
    const days: DayWorkload[] = [];

    let totalSessions = 0;
    let totalMinutes = 0;
    let totalDeadlines = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const daySessions = sessions.filter((s) => s.dayOfWeek === i);
      const dayDeadlines = allDeadlines.filter((d) => d.dueDate === dateStr);

      const dayMinutes = daySessions.reduce((sum, s) => {
        return sum + (toMinutes(s.endTime) - toMinutes(s.startTime));
      }, 0);

      const level = classifyWorkload(dayMinutes, dayDeadlines.length);

      days.push({
        dayOfWeek: i,
        sessionCount: daySessions.length,
        totalMinutes: dayMinutes,
        deadlineCount: dayDeadlines.length,
        level,
      });

      totalSessions += daySessions.length;
      totalMinutes += dayMinutes;
      totalDeadlines += dayDeadlines.length;
    }

    const weekLevel = classifyWorkload(totalMinutes / 7, totalDeadlines / 7);

    return {
      totalSessions,
      totalMinutes,
      totalDeadlines,
      level: weekLevel,
      days,
    };
  },
});
