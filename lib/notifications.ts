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

// Schedule a deadline reminder
export async function scheduleDeadlineReminder(args: {
  title: string;
  courseCode: string;
  dueDate: string;
  dueTime?: string;
  leadHours: number;
}): Promise<string | null> {
  const { title, courseCode, dueDate, dueTime, leadHours } = args;

  // Calculate trigger date
  const dueDateTime = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T23:59:59`;
  const triggerDate = new Date(dueDateTime);
  triggerDate.setHours(triggerDate.getHours() - leadHours);

  // Don't schedule if already past
  if (triggerDate.getTime() <= Date.now()) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Deadline approaching`,
      body: `${courseCode} — ${title} due in ${leadHours}h`,
      data: { type: 'deadline', title, courseCode },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return id;
}

// Schedule a session reminder
export async function scheduleSessionReminder(args: {
  courseCode: string;
  type: string;
  dayOfWeek: number;
  startTime: string;
  leadMinutes: number;
}): Promise<string | null> {
  const { courseCode, type, dayOfWeek, startTime, leadMinutes } = args;

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

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Upcoming ${type}`,
      body: `${courseCode} ${type} starts in ${leadMinutes} minutes`,
      data: { type: 'session', courseCode, sessionType: type },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
    },
  });

  return id;
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
