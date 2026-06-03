import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuthLoading, useSession } from '@meche/api-client';
import { MPAL } from '@meche/ui';

// Entry gate: send authed users to the tabs, everyone else to onboarding.
export default function Index() {
  const session = useSession();
  const loading = useAuthLoading();
  if (loading) return <View style={{ flex: 1, backgroundColor: MPAL.bg }} />;
  return <Redirect href={session ? '/(tabs)/explore' : '/welcome'} />;
}
