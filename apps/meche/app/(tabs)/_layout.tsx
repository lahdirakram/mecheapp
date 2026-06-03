import { Redirect, Tabs, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAuthLoading, useSession } from '@meche/api-client';
import { MPAL, TabBar, type B2CTab } from '@meche/ui';
import { useTryStore } from '../../lib/tryStore';

// Minimal shape of the props expo-router hands its tabBar (avoids a direct dep on
// @react-navigation/bottom-tabs, which is only transitive).
interface TabBarRenderProps {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
}

// Custom floating glass tab bar driving expo-router's Tabs. The central caramel button
// launches the selfie → hub try-on flow (presented as a modal route).
function CustomTabBar({ state, navigation }: TabBarRenderProps) {
  const router = useRouter();
  const active = state.routes[state.index]?.name as B2CTab;
  return (
    <TabBar
      active={active}
      onChange={(tab) => navigation.navigate(tab)}
      onPressCenter={() => {
        // Central button = no specific look chosen → go through "Ton idée".
        useTryStore.getState().setDirect(false);
        router.push('/try');
      }}
      dark={active === 'explore'}
      // Coiffeurs (the stylist marketplace) ships with Mèche Pro — disabled with a badge for now.
      comingSoon="salons"
    />
  );
}

export default function TabsLayout() {
  const session = useSession();
  const loading = useAuthLoading();

  // Auth guard: signing out (session → null) or arriving unauthenticated returns to Welcome,
  // instead of stranding the user on a tab showing 0 credits.
  if (loading) return <View style={{ flex: 1, backgroundColor: MPAL.bg }} />;
  if (!session) return <Redirect href="/welcome" />;

  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="wardrobe" />
      <Tabs.Screen name="salons" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
