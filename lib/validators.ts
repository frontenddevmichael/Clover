// Validation utility helpers — shared across all screens.

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validate passcode: at least 4 digits */
export function isValidPasscode(passcode: string): boolean {
  return /^\d{4,}$/.test(passcode);
}

/** Validate course code format: letters + numbers, 2-10 chars */
export function isValidCourseCode(code: string): boolean {
  return /^[A-Z]{2,4}\d{2,4}[A-Z]?$/.test(code.trim().toUpperCase());
}

/** Validate time format: "HH:MM" */
export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/** Validate date format: "YYYY-MM-DD" */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date + 'T00:00:00');
  return !isNaN(d.getTime());
}

/** Trim and normalize email to lowercase */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Trim and uppercase a course code */
export function normalizeCourseCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}
