// Root index — redirects to onboarding on first load
import { Redirect } from 'expo-router';

export default function RootIndex() {
  return <Redirect href="/onboarding" />;
}
