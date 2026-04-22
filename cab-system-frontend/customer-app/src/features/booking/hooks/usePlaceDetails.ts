// src/features/booking/hooks/usePlaceDetails.ts
import { useState, useCallback } from 'react';
import { getPlaceDetails } from '../services';
import { PlaceDetails } from '../types';

export const usePlaceDetails = () => {
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaceDetails = useCallback(async (placeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const details = await getPlaceDetails(placeId);
      setPlaceDetails(details);
      return details;
    } catch (err) {
      setError('Failed to get place details');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { placeDetails, loading, error, fetchPlaceDetails };
};
