// src/features/booking/hooks/useCurrentLocation.ts
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Coordinates } from '../types';

export const useCurrentLocation = () => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        });
      } catch (err) {
        setError('Error getting location');
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { location, error, loading };
};