// src/features/booking/hooks/useNearbyPlaces.ts
import { useState, useEffect } from 'react';
import { getNearbyPlaces } from '../services';
import { Coordinates, NearbyPlace } from '../types';

export const useNearbyPlaces = (coords: Coordinates | null) => {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coords) return;

    const fetchNearbyPlaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await getNearbyPlaces(coords);
        setPlaces(results);
      } catch (err) {
        setError('Failed to get nearby places');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyPlaces();
  }, [coords]);

  return { places, loading, error };
};