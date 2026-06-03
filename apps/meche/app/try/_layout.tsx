import { Stack } from 'expo-router';

// The central-button try-on flow: selfie → hub → (paths) → generating → result.
export default function TryLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }} />;
}
