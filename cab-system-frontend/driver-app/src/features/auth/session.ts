import AsyncStorage from "@react-native-async-storage/async-storage";

import { DriverAuthResponse } from "../../auth/apis/auth";

const DRIVER_SESSION_KEY = "@cab_booking/driver_session";

export interface DriverAuthSession {
  accessToken: string;
  refreshToken?: string;
  user: NonNullable<DriverAuthResponse["user"]>;
}

export async function saveDriverSession(
  session: DriverAuthSession
): Promise<void> {
  await AsyncStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(session));
}

export async function getDriverSession(): Promise<DriverAuthSession | null> {
  const rawValue = await AsyncStorage.getItem(DRIVER_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as DriverAuthSession;
  } catch {
    await AsyncStorage.removeItem(DRIVER_SESSION_KEY);
    return null;
  }
}

export async function clearDriverSession(): Promise<void> {
  await AsyncStorage.removeItem(DRIVER_SESSION_KEY);
}
