import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders, MPAL } from '@meche/ui';
import { SupabaseProvider } from '@meche/api-client';
import { supabase } from '../lib/supabase';

// Auto-login from the email-confirmation deep link: it returns as meche://auth-callback?code=…
// We exchange that code for a session (PKCE) so the user lands signed in — no manual re-login.
function useAuthDeepLink() {
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;
    const { queryParams } = Linking.parse(url);
    const code = queryParams?.code;
    if (typeof code === 'string') {
      supabase.auth.exchangeCodeForSession(code).catch(() => {});
    }
  }, [url]);
}

export default function RootLayout() {
  useAuthDeepLink();
  return (
    <AppProviders>
      <SupabaseProvider client={supabase}>
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
