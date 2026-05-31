import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings } from "../types/settings";

const SETTINGS_KEY = "timezap_settings";

export async function getStoredSettings(): Promise<AppSettings | null> {
  const rawValue = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AppSettings;
  } catch {
    return null;
  }
}

export async function setStoredSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function clearStoredSettings(): Promise<void> {
  await AsyncStorage.removeItem(SETTINGS_KEY);
}
