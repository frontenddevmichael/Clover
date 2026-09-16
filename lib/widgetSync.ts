// Widget data sync — pushes schedule data to the home screen widget.
import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_DATA_KEY = '@clover_widget_data';

export type WidgetSession = {
  code: string;
  type: string;
  startTime: string;
  endTime: string;
  location?: string;
};

export type WidgetDeadline = {
  code: string;
  title: string;
  type: string;
  dueDate: string;
  dueTime?: string;
};

export type WidgetData = {
  sessions: WidgetSession[];
  deadlines: WidgetDeadline[];
  focusMinutes: number;
  lastUpdated: string;
};

// ── Save widget data locally and notify widget ──
export async function saveWidgetData(data: WidgetData): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
    // Attempt to update the widget (only works in EAS builds with expo-widgets)
    const mod = await import('../components/TodayWidget').catch(() => null);
    if (mod?.default?.ensureWidget) {
      const widget = await mod.default.ensureWidget();
      if (widget?.updateSnapshot) {
        widget.updateSnapshot(data);
      }
    }
  } catch {}
}

// ── Load current widget data ──
export async function loadWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Build widget data from Convex queries ──
export function buildWidgetData(args: {
  sessions: Array<{
    courseCode: string;
    type: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
  deadlines: Array<{
    courseCode: string;
    title: string;
    type: string;
    dueDate: string;
    dueTime?: string;
    completed: boolean;
  }>;
  todayFocusMinutes: number;
}): WidgetData {
  const today = new Date().getDay();

  const todaySessions = args.sessions
    .filter((s) => s.dayOfWeek === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((s) => ({
      code: s.courseCode,
      type: s.type,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
    }));

  const upcomingDeadlines = args.deadlines
    .filter((d) => !d.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
    .map((d) => ({
      code: d.courseCode,
      title: d.title,
      type: d.type,
      dueDate: d.dueDate,
      dueTime: d.dueTime,
    }));

  return {
    sessions: todaySessions,
    deadlines: upcomingDeadlines,
    focusMinutes: args.todayFocusMinutes,
    lastUpdated: new Date().toISOString(),
  };
}
