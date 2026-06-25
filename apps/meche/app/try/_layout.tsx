import { Stack } from 'expo-router';

// The central-button try-on flow: selfie → hub → (paths) → generating → result.
// gestureEnabled is off across the flow: every screen has an explicit back/close button, and the
// swipe-back here was risky (it could cancel the loader mid-generation, or fight the result screen's
// before/after slider). The root `try` modal already disables its own dismiss gesture for the same
// reason; this extends that to navigation between the nested screens.
export default function TryLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' }, gestureEnabled: false }} />;
}
