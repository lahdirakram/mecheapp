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
          <Stack.Screen name="try" options={{ presentation: 'modal' }} />
          <Stack.Screen name="recharge" options={{ presentation: 'modal' }} />
          <Stack.Screen name="share" options={{ presentation: 'modal' }} />
          <Stack.Screen name="look" options={{ presentation: 'modal' }} />
        </Stack>
      </SupabaseProvider>
    </AppProviders>
  );
}
