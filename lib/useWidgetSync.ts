// useWidgetSync — automatically syncs schedule data to the home screen widget.
import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from './auth';
import { useAppState } from './useAppState';
import { buildWidgetData, saveWidgetData } from './widgetSync';

export function useWidgetSync() {
  const { userId } = useAuth();
  const appState = useAppState();
  const lastSyncRef = useRef(0);

  const sessions = useQuery(
    api.sessions.listByUser,
    userId ? { userId } : 'skip'
  );
  const deadlines = useQuery(
    api.deadlines.listUpcoming,
    userId ? { userId, fromDate: new Date().toISOString().split('T')[0] } : 'skip'
  );
  const todayStats = useQuery(
    api.focusSessions.todayStats,
    userId ? { userId } : 'skip'
  );

  // Sync when data changes or app foregrounds
  useEffect(() => {
    if (!sessions || !deadlines) return;

    // Debounce: don't sync more than once per 5 seconds
    const now = Date.now();
    if (now - lastSyncRef.current < 5000) return;
    lastSyncRef.current = now;

    const courseMap = new Map<string, string>();

    const sessionData = sessions.map((s: any) => ({
      courseCode: courseMap.get(s.courseId) ?? s.courseId,
      type: s.type,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
    }));

    const deadlineData = deadlines.map((d: any) => ({
      courseCode: courseMap.get(d.courseId) ?? d.courseId,
      title: d.title,
      type: d.type,
      dueDate: d.dueDate,
      dueTime: d.dueTime,
      completed: d.completed,
    }));

    const widgetData = buildWidgetData({
      sessions: sessionData,
      deadlines: deadlineData,
      todayFocusMinutes: todayStats?.totalMinutes ?? 0,
    });

    saveWidgetData(widgetData);
  }, [sessions, deadlines, todayStats, appState]);

  // Also sync when app comes to foreground
  useEffect(() => {
    if (appState !== 'active' || !sessions || !deadlines) return;

    lastSyncRef.current = Date.now();

    const sessionData = sessions.map((s: any) => ({
      courseCode: s.courseId,
      type: s.type,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
    }));

    const deadlineData = deadlines.map((d: any) => ({
      courseCode: d.courseId,
      title: d.title,
      type: d.type,
      dueDate: d.dueDate,
      dueTime: d.dueTime,
      completed: d.completed,
    }));

    const widgetData = buildWidgetData({
      sessions: sessionData,
      deadlines: deadlineData,
      todayFocusMinutes: todayStats?.totalMinutes ?? 0,
    });

    saveWidgetData(widgetData);
  }, [appState]);
}
