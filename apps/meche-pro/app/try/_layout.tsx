import { Stack } from 'expo-router';

// The in-chair try-on flow: selfie → idée → generating → result. gestureEnabled off across the
// flow (same reasons as B2C): every screen has an explicit back/close, and swipe-back could cancel
// the loader mid-generation or fight the result screen's before/after slider.
export default function TryLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' }, gestureEnabled: false }} />;
}
