// src/features/booking/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlaceDetails } from '../types';

const STORAGE_KEYS = {
  HOME_ADDRESS: '@cab_booking_home_address',
  WORK_ADDRESS: '@cab_booking_work_address',
  RECENT_PLACES: '@cab_booking_recent_places',
  PICKUP_HISTORY: '@cab_booking_pickup_history',
};

// Home Address
export const saveHomeAddress = async (place: PlaceDetails): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.HOME_ADDRESS, JSON.stringify(place));
};

export const getHomeAddress = async (): Promise<PlaceDetails | null> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.HOME_ADDRESS);
  return data ? JSON.parse(data) : null;
};

export const removeHomeAddress = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.HOME_ADDRESS);
};

// Work Address
export const saveWorkAddress = async (place: PlaceDetails): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.WORK_ADDRESS, JSON.stringify(place));
};

export const getWorkAddress = async (): Promise<PlaceDetails | null> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.WORK_ADDRESS);
  return data ? JSON.parse(data) : null;
};

export const removeWorkAddress = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.WORK_ADDRESS);
};

// Recent Places
export const saveRecentPlace = async (place: PlaceDetails): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_PLACES);
    let places: PlaceDetails[] = existing ? JSON.parse(existing) : [];
    
    places = places.filter((p) => p.place_id !== place.place_id);
    places.unshift(place);
    places = places.slice(0, 5);
    
    await AsyncStorage.setItem(STORAGE_KEYS.RECENT_PLACES, JSON.stringify(places));
  } catch (error) {
    console.error('Save recent place error:', error);
  }
};

export const getRecentPlaces = async (): Promise<PlaceDetails[]> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_PLACES);
  return data ? JSON.parse(data) : [];
};

export const clearRecentPlaces = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.RECENT_PLACES);
};

// Pickup History
export const savePickupHistory = async (address: string, coords: { lat: number; lng: number }): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.PICKUP_HISTORY);
    let history = existing ? JSON.parse(existing) : [];
    
    history.unshift({ address, coords, timestamp: Date.now() });
    history = history.slice(0, 10);
    
    await AsyncStorage.setItem(STORAGE_KEYS.PICKUP_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Save pickup history error:', error);
  }
};

export const getPickupHistory = async (): Promise<any[]> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.PICKUP_HISTORY);
  return data ? JSON.parse(data) : [];
};
