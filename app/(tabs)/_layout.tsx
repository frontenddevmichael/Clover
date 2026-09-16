// Tabs layout — NavDock (per lib/nav-dock-spec.md): 4 tabs + morphing center.
// Settings is no longer a tab; it lives behind the ProfileButton avatar that
// every tab header renders top-right.
import { Tabs } from 'expo-router';
import NavDock from '@/components/NavDock';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <NavDock />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Schedule' }} />
      <Tabs.Screen name="deadlines" options={{ title: 'Deadlines' }} />
      <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="social" options={{ title: 'Course Rooms' }} />
      <Tabs.Screen name="assistant" options={{ title: 'Assistant' }} />
      {/* Courses is a pushed screen, not a dock destination */}
      <Tabs.Screen name="courses" options={{ href: null }} />
      {/* Reachable only via the header ProfileButton — not a dock destination */}
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
