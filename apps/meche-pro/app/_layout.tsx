import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders, MPAL } from '@meche/ui';
import { SupabaseProvider } from '@meche/api-client';
import { supabase } from '../lib/supabase';
import { PurchasesSync } from '../lib/PurchasesSync';

export default function RootLayout() {
  return (
    <AppProviders>
      <SupabaseProvider client={supabase}>
        <PurchasesSync />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: MPAL.bg },
          }}
        >
          {/* fullScreenModal (not 'modal'): the iOS sheet's rubber-band drag steals gestures from
              the result screen's before/after slider even with gestureEnabled off — same fix as the
              B2C app. */}
          <Stack.Screen name="try" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack>
      </SupabaseProvider>
    </AppProviders>
  );
}
