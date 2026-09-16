// Notification system — handles permission requests, scheduling, and delivery.
// Uses expo-notifications for local notifications on the device.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request notification permissions
export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

// Check if a date falls within quiet hours (FR27)
function isWithinQuietHours(date: Date, start: string, end: string): boolean {
  const h = date.getHours();
  const m = date.getMinutes();
  const currentMinutes = h * 60 + m;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  // Handle overnight quiet hours (e.g. 22:00 - 07:00)
  if (startMin > endMin) {
    return currentMinutes >= startMin || currentMinutes < endMin;
  }
  return currentMinutes >= startMin && currentMinutes < endMin;
}

// Adjust a trigger date to avoid quiet hours — push to end of quiet window
function avoidQuietHours(date: Date, start: string, end: string): Date {
  if (!isWithinQuietHours(date, start, end)) return date;
  const [eh, em] = end.split(':').map(Number);
  const adjusted = new Date(date);
  adjusted.setHours(eh, em, 0, 0);
  return adjusted;
}

// Schedule a deadline reminder (FR26)
export async function scheduleDeadlineReminder(args: {
  title: string;
  courseCode: string;
  dueDate: string;
  dueTime?: string;
  leadHours: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}): Promise<string | null> {
  const { title, courseCode, dueDate, dueTime, leadHours, quietHoursStart = '22:00', quietHoursEnd = '07:00' } = args;

  // Calculate trigger date
  const dueDateTime = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T23:59:59`;
  const triggerDate = new Date(dueDateTime);
  triggerDate.setHours(triggerDate.getHours() - leadHours);

  // Don't schedule if already past
  if (triggerDate.getTime() <= Date.now()) return null;

  // Respect quiet hours (FR27)
  const adjusted = avoidQuietHours(triggerDate, quietHoursStart, quietHoursEnd);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Deadline approaching`,
      body: `${courseCode} — ${title} due in ${leadHours}h`,
      data: { type: 'deadline', title, courseCode },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: adjusted,
    },
  });

  return id;
}

// Schedule a session reminder (FR25)
export async function scheduleSessionReminder(args: {
  courseCode: string;
  type: string;
  dayOfWeek: number;
  startTime: string;
  leadMinutes: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}): Promise<string | null> {
  const { courseCode, type, dayOfWeek, startTime, leadMinutes, quietHoursStart = '22:00', quietHoursEnd = '07:00' } = args;

  // Calculate next occurrence of this day + time
  const now = new Date();
  const [hours, minutes] = startTime.split(':').map(Number);
  const target = new Date();
  target.setDate(now.getDate() + ((dayOfWeek - now.getDay() + 7) % 7));
  target.setHours(hours, minutes - leadMinutes, 0, 0);

  // If it's already past this week, schedule for next week
  if (target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 7);
  }

  // Respect quiet hours (FR27)
  const adjusted = avoidQuietHours(target, quietHoursStart, quietHoursEnd);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Upcoming ${type}`,
      body: `${courseCode} ${type} starts in ${leadMinutes} minutes`,
      data: { type: 'session', courseCode, sessionType: type },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: adjusted,
    },
  });

  return id;
}

// Schedule all reminders for a user's sessions (called on app start / sync)
export async function scheduleAllSessionReminders(args: {
  sessions: Array<{ courseId: string; courseCode: string; type: string; dayOfWeek: number; startTime: string }>;
  leadMinutes: number;
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}): Promise<void> {
  const { sessions, leadMinutes, enabled, quietHoursStart, quietHoursEnd } = args;
  if (!enabled) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const s of sessions) {
    await scheduleSessionReminder({
      courseCode: s.courseCode,
      type: s.type,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      leadMinutes,
      quietHoursStart,
      quietHoursEnd,
    });
  }
}

// Cancel all scheduled notifications
export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get all scheduled notifications (for display in settings)
export async function getScheduled(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

// Add a listener for notification interactions (taps)
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
}
