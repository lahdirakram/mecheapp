import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders, MPAL } from '@meche/ui';
import { SupabaseProvider } from '@meche/api-client';
import { supabase } from '../lib/supabase';
import { PurchasesSync } from '../lib/PurchasesSync';
import { PushSync } from '../lib/PushSync';
import { TryStoreReset } from '../lib/TryStoreReset';

export default function RootLayout() {
  return (
    <AppProviders>
      <SupabaseProvider client={supabase}>
        <PurchasesSync />
        <PushSync />
        <TryStoreReset />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: MPAL.bg },
          }}
        >
          {/* fullScreenModal (not 'modal'): the iOS sheet's rubber-band drag steals gestures from
              the result screen's before/after slider even with gestureEnabled off. A full-screen
              modal has no native drag gesture at all, so the slider owns every drag. Close via the
              back arrow. */}
          <Stack.Screen name="try" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="recharge" options={{ presentation: 'modal' }} />
          <Stack.Screen name="share" options={{ presentation: 'modal' }} />
        </Stack>
      </SupabaseProvider>
    </AppProviders>
  );
}
