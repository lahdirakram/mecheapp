import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { MPAL } from '@meche/core';
import { fontMap } from './theme/fonts';
import { FeedbackProvider } from './feedback';
import { useLangHydrated } from './i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/**
 * Single root wrapper shared by both apps: gesture handler + safe-area + react-query,
 * and blocks render until the three brand fonts are loaded (avoids a flash of fallback type) and
 * the stored language has been read back off the device (same reason, applied to copy: an EN user
 * would otherwise see French paint first, since AsyncStorage cannot be read synchronously).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts(fontMap);
  const langHydrated = useLangHydrated();
  const ready = fontsLoaded && langHydrated;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: MPAL.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <FeedbackProvider>{ready ? children : <View style={{ flex: 1, backgroundColor: MPAL.bg }} />}</FeedbackProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
