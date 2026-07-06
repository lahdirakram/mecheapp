import { Redirect, Tabs, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAuthLoading, useMySalon, useProfile, useSession } from '@meche/api-client';
import { MPAL, PTabBar, type ProTab } from '@meche/ui';
import { NotAPro } from '../../components/NotAPro';
import { useTryStore } from '../../lib/tryStore';

// Minimal shape of the props expo-router hands its tabBar (avoids a direct dep on
// @react-navigation/bottom-tabs, which is only transitive).
interface TabBarRenderProps {
  state: { index: number; routes: { name: string }[] };
  navigation: { navigate: (name: string) => void };
}

// Pro floating glass tab bar. The central caramel button launches the in-chair try-on flow.
function CustomTabBar({ state, navigation }: TabBarRenderProps) {
  const router = useRouter();
  const active = state.routes[state.index]?.name as ProTab;
  return (
    <PTabBar
      active={active}
      onChange={(tab) => navigation.navigate(tab)}
      onPressCenter={() => {
        // Fresh client, fresh flow — reset clears any stale selfie/brief/refine.
        useTryStore.getState().reset();
        router.push('/try');
      }}
    />
  );
}

export default function TabsLayout() {
  const session = useSession();
  const loading = useAuthLoading();
  const { data: profile } = useProfile(session?.user.id);
  const { data: salon, isPending: salonPending, isFetching: salonFetching } = useMySalon(session?.user.id);

  // Auth guard: signing out (session → null) or arriving unauthenticated returns to Welcome.
  if (loading) return <View style={{ flex: 1, backgroundColor: MPAL.bg }} />;
  if (!session) return <Redirect href="/welcome" />;
  // Strict separation: a B2C (client) account never enters the pro app.
  if (profile && profile.role !== 'pro') return <NotAPro />;
  // Salon guard: a pro without a salon fiche finishes onboarding first. Hold (blank) while the
  // query is pending OR while a refetch is in flight with no salon yet — redirecting on a stale
  // null right after onboarding bounced the user straight back to "Crée ton salon".
  if (salonPending || (!salon && salonFetching)) return <View style={{ flex: 1, backgroundColor: MPAL.bg }} />;
  if (!salon) return <Redirect href="/onboarding" />;

  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="studio" />
      <Tabs.Screen name="essais" />
      <Tabs.Screen name="salon" />
    </Tabs>
  );
}
