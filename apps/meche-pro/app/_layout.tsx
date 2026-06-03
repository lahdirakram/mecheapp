import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders, MPAL } from '@meche/ui';
import { SupabaseProvider } from '@meche/api-client';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  return (
    <AppProviders>
      <SupabaseProvider client={supabase}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: MPAL.bg },
          }}
        />
      </SupabaseProvider>
    </AppProviders>
  );
}
