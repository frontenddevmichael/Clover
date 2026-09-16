// Analytics — aggregates study data for insights screen.
export type DailyMinutes = {
  date: string; // "YYYY-MM-DD"
  minutes: number;
};

export type CourseBreakdown = {
  code: string;
  title: string;
  minutes: number;
  sessions: number;
  color: string;
};

export type WeeklyTrend = {
  week: string; // "W1", "W2", etc.
  minutes: number;
};

export type InsightStats = {
  totalMinutesThisWeek: number;
  totalMinutesThisMonth: number;
  avgDailyMinutes: number;
  streakDays: number;
  mostProductiveDay: string;
  mostProductiveHour: string;
  totalSessionsCompleted: number;
  totalFocusSessions: number;
  focusMinutes: number;
};

// ── Calculate minutes between two times ──
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ── Get minutes for a session ──
function getSessionMinutes(start: string, end: string): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return e > s ? e - s : (e + 1440) - s;
}

// ── Get date string from dayOfWeek relative to today ──
function getDateForDay(dayOfWeek: number): Date {
  const today = new Date();
  const current = today.getDay();
  let diff = dayOfWeek - current;
  if (diff < 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return d;
}

// ── Aggregate daily minutes from sessions ──
export function aggregateDailyMinutes(
  sessions: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
  days: number = 7
): DailyMinutes[] {
  const result: DailyMinutes[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];

    const daySessions = sessions.filter((s) => s.dayOfWeek === dayOfWeek);
    const minutes = daySessions.reduce(
      (sum, s) => sum + getSessionMinutes(s.startTime, s.endTime),
      0
    );

    result.push({ date: dateStr, minutes });
  }

  return result;
}

// ── Aggregate course breakdown ──
export function aggregateCourseBreakdown(
  sessions: Array<{
    courseId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
  courses: Array<{
    _id: string;
    code: string;
    title: string;
    color: string;
  }>
): CourseBreakdown[] {
  const courseMap = new Map(courses.map((c) => [c._id, c]));
  const breakdownMap = new Map<string, CourseBreakdown>();

  for (const session of sessions) {
    const course = courseMap.get(session.courseId);
    if (!course) continue;

    const existing = breakdownMap.get(session.courseId);
    const minutes = getSessionMinutes(session.startTime, session.endTime);

    if (existing) {
      existing.minutes += minutes;
      existing.sessions += 1;
    } else {
      breakdownMap.set(session.courseId, {
        code: course.code,
        title: course.title,
        minutes,
        sessions: 1,
        color: course.color,
      });
    }
  }

  return Array.from(breakdownMap.values()).sort((a, b) => b.minutes - a.minutes);
}

// ── Weekly trend (last 4 weeks) ──
export function aggregateWeeklyTrend(
  sessions: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>
): WeeklyTrend[] {
  const result: WeeklyTrend[] = [];
  const today = new Date();

  for (let w = 3; w >= 0; w--) {
    let weekMinutes = 0;
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + (6 - d)));
      const dayOfWeek = date.getDay();
      const daySessions = sessions.filter((s) => s.dayOfWeek === dayOfWeek);
      weekMinutes += daySessions.reduce(
        (sum, s) => sum + getSessionMinutes(s.startTime, s.endTime),
        0
      );
    }
    result.push({ week: `W${4 - w}`, minutes: weekMinutes });
  }

  return result;
}

// ── Compute insight stats ──
export function computeInsightStats(args: {
  sessions: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  focusSessions: Array<{
    completed: boolean;
    durationMinutes: number;
    startedAt: number;
    type: string;
  }>;
  deadlines: Array<{
    completed: boolean;
  }>;
}): InsightStats {
  const { sessions, focusSessions, deadlines } = args;
  const today = new Date();
  const dayOfWeek = today.getDay();

  // This week's minutes from recurring sessions
  const thisWeekMinutes = sessions.reduce((sum, s) => {
    return sum + getSessionMinutes(s.startTime, s.endTime);
  }, 0);

  // Monthly estimate (4 weeks)
  const thisMonthMinutes = thisWeekMinutes * 4;

  // Average daily (this week / 7)
  const avgDaily = Math.round(thisWeekMinutes / 7);

  // Streak: consecutive days with at least one session
  let streak = 0;
  for (let i = 0; i < 7; i++) {
    const checkDay = (dayOfWeek - i + 7) % 7;
    const hasSession = sessions.some((s) => s.dayOfWeek === checkDay);
    if (hasSession) streak++;
    else break;
  }

  // Most productive day
  const dayMinutes: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const s of sessions) {
    const name = dayNames[s.dayOfWeek];
    dayMinutes[name] = (dayMinutes[name] || 0) + getSessionMinutes(s.startTime, s.endTime);
  }
  const mostProductiveDay = Object.entries(dayMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Most productive hour (from sessions)
  const hourCounts: Record<number, number> = {};
  for (const s of sessions) {
    const hour = timeToMinutes(s.startTime) / 60;
    hourCounts[Math.floor(hour)] = (hourCounts[Math.floor(hour)] || 0) + getSessionMinutes(s.startTime, s.endTime);
  }
  const topHour = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const mostProductiveHour = topHour
    ? `${Number(topHour[0])}:00`
    : 'N/A';

  // Focus sessions
  const completedFocus = focusSessions.filter((f) => f.completed && f.type === 'pomodoro');
  const focusMinutes = completedFocus.reduce((sum, f) => sum + f.durationMinutes, 0);

  return {
    totalMinutesThisWeek: thisWeekMinutes,
    totalMinutesThisMonth: thisMonthMinutes,
    avgDailyMinutes: avgDaily,
    streakDays: streak,
    mostProductiveDay,
    mostProductiveHour,
    totalSessionsCompleted: deadlines.filter((d) => d.completed).length,
    totalFocusSessions: completedFocus.length,
    focusMinutes,
  };
}
