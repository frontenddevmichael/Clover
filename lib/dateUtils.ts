// Date/time utility helpers — shared across all screens.
// No external dependencies; uses native Date only.

/** Convert "HH:MM" to total minutes since midnight */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Get a Date object for a given day-of-week (1=Sun … 6=Sat) in the current week */
export function dateForDayOfWeek(dayOfWeek: number): Date {
  const now = new Date();
  const diff = dayOfWeek - now.getDay();
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return d;
}

/** Days remaining until a date string (YYYY-MM-DD). Negative = overdue. */
export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Format a date string to a relative label: "Today", "Tomorrow", "in X days", "X days overdue" */
export function formatRelativeDate(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days overdue`;
}

/** Format "YYYY-MM-DD" to a readable string: "Mon, Sep 15" */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Format "HH:MM" to 12-hour: "2:00 PM" */
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Check if a session is active right now (day matches and time is within range) */
export function isActiveSession(session: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): boolean {
  const now = new Date();
  if (now.getDay() !== session.dayOfWeek) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(session.startTime);
  const end = toMinutes(session.endTime);
  return nowMin >= start && nowMin <= end;
}

/** Get day name from day-of-week number */
export function getDayName(dayOfWeek: number, short = true): string {
  const d = new Date(2024, 0, dayOfWeek + 1);
  return d.toLocaleDateString('en-NG', { weekday: short ? 'short' : 'long' });
}
