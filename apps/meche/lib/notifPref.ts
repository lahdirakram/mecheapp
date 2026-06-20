import AsyncStorage from '@react-native-async-storage/async-storage';

// Push preference is inherently per-device, so it lives locally (not in the DB). Defaults ON.
const KEY = 'meche.pushEnabled';

export async function getPushEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v == null ? true : v === '1';
}

export async function setPushEnabledPref(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, on ? '1' : '0');
}
