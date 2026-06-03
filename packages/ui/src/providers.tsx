import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { MPAL } from '@meche/core';
import { fontMap } from './theme/fonts';
import { FeedbackProvider } from './feedback';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/**
 * Single root wrapper shared by both apps: gesture handler + safe-area + react-query,
 * and blocks render until the three brand fonts are loaded (avoids a flash of fallback type).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts(fontMap);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: MPAL.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <FeedbackProvider>{fontsLoaded ? children : <View style={{ flex: 1, backgroundColor: MPAL.bg }} />}</FeedbackProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
