// src/features/booking/hooks/useReverseGeocode.ts
import { useState, useCallback } from 'react';
import { getAddressFromCoords } from '../services/locationApi';
import { Coordinates } from '../types';

export const useReverseGeocode = () => {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddress = useCallback(async (coords: Coordinates) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAddressFromCoords(coords);
      setAddress(result);
      return result;
    } catch (err) {
      setError('Failed to get address');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { address, loading, error, fetchAddress };
};
