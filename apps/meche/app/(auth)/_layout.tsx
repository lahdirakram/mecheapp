import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuthLoading, useSession } from '@meche/api-client';
import { MPAL } from '@meche/ui';

// Inverse guard: an already-authenticated user who lands on an auth screen (e.g. via browser
// back) is sent into the app instead of seeing onboarding again.
export default function AuthLayout() {
  const session = useSession();
  const loading = useAuthLoading();
  if (loading) return <View style={{ flex: 1, backgroundColor: MPAL.bg }} />;
  if (session) return <Redirect href="/(tabs)/explore" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: MPAL.bg } }} />;
}
