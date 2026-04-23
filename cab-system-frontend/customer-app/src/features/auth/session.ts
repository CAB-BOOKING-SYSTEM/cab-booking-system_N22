import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthUser } from "./types";

const CUSTOMER_SESSION_KEY = "@cab_booking/customer_session";

export interface CustomerAuthSession {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export async function saveCustomerSession(
  session: CustomerAuthSession
): Promise<void> {
  await AsyncStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
}

export async function getCustomerSession(): Promise<CustomerAuthSession | null> {
  const rawValue = await AsyncStorage.getItem(CUSTOMER_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as CustomerAuthSession;
  } catch {
    await AsyncStorage.removeItem(CUSTOMER_SESSION_KEY);
    return null;
  }
}

export async function clearCustomerSession(): Promise<void> {
  await AsyncStorage.removeItem(CUSTOMER_SESSION_KEY);
}
