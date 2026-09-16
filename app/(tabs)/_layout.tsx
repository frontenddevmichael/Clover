// Tabs layout — NavDock: 3 tabs (Home, Deadlines, Assistant) + center CTA.
// Focus, Insights, Rooms accessible via SideDrawer header menu.
// Profile accessible via SideDrawer. Settings via header gear icon.
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
      <Tabs.Screen name="assistant" options={{ title: 'Assistant' }} />
      {/* Hidden tabs — reachable via SideDrawer or direct navigation */}
      <Tabs.Screen name="focus" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="social" options={{ href: null }} />
      <Tabs.Screen name="courses" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
