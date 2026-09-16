// Calendar integration — read/write device calendar events.
import {
  requestCalendarPermissions,
  getCalendarPermissions,
  getCalendars,
  createCalendar,
  listEvents,
  ExpoCalendar,
  ExpoCalendarEvent,
  EntityTypes,
} from 'expo-calendar';

const CLOVERCALENDAR_NAME = 'Clover';

// ── Permissions ──
export async function requestCalendarAccess(): Promise<boolean> {
  const result = await requestCalendarPermissions();
  return result.granted;
}

export async function isCalendarGranted(): Promise<boolean> {
  const result = await getCalendarPermissions();
  return result.granted;
}

// ── Get or create a Clover calendar ──
async function getCloverCalendar(): Promise<ExpoCalendar | null> {
  const calendars = await getCalendars(EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === CLOVERCALENDAR_NAME && c.allowsModifications);
  if (existing) return existing;

  const writable = calendars.find((c) => c.allowsModifications);
  if (!writable) return null;

  try {
    return await createCalendar({
      title: CLOVERCALENDAR_NAME,
      color: '#7C9A6E',
      entityType: EntityTypes.EVENT,
      sourceId: writable.sourceId,
      name: CLOVERCALENDAR_NAME,
    });
  } catch {
    return null;
  }
}

// ── Read events from device calendar for a date range ──
export async function getEventsForDateRange(
  startDate: Date,
  endDate: Date
): Promise<ExpoCalendarEvent[]> {
  const granted = await isCalendarGranted();
  if (!granted) return [];

  const calendars = await getCalendars(EntityTypes.EVENT);

  try {
    return await listEvents(calendars, startDate, endDate);
  } catch {
    return [];
  }
}

// ── Get today's external calendar events ──
export async function getTodayEvents(): Promise<ExpoCalendarEvent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getEventsForDateRange(today, tomorrow);
}

// ── Check for time conflicts with device calendar ──
export async function findConflicts(
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<ExpoCalendarEvent[]> {
  const today = new Date();
  const currentDay = today.getDay();

  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0) daysUntil += 7;

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntil);

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const rangeStart = new Date(targetDate);
  rangeStart.setHours(startH, startM, 0, 0);
  const rangeEnd = new Date(targetDate);
  rangeEnd.setHours(endH, endM, 0, 0);

  const events = await getEventsForDateRange(rangeStart, rangeEnd);

  return events.filter((event) => {
    const eStart = new Date(event.startDate).getTime();
    const eEnd = new Date(event.endDate).getTime();
    const sStart = rangeStart.getTime();
    const sEnd = rangeEnd.getTime();
    return eStart < sEnd && eEnd > sStart;
  });
}

// ── Write a session to the device calendar ──
export async function createCalendarEvent(args: {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
}): Promise<string | null> {
  const granted = await requestCalendarAccess();
  if (!granted) return null;

  const calendar = await getCloverCalendar();
  if (!calendar) return null;

  try {
    const event = await calendar.createEvent({
      title: args.title,
      startDate: args.startDate,
      endDate: args.endDate,
      location: args.location,
      notes: args.notes,
      alarms: [{ relativeOffset: -15 }],
    });
    return event.id;
  } catch {
    return null;
  }
}

// ── Delete a calendar event ──
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const event = await ExpoCalendarEvent.get(eventId);
    await event.delete();
    return true;
  } catch {
    return false;
  }
}
