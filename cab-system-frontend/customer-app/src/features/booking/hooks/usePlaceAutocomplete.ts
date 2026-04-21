// src/features/booking/hooks/usePlaceAutocomplete.ts
import { useState, useCallback } from 'react';
import { getPlacePredictions } from '../services/locationApi';
import { PlacePrediction } from '../types';
import { debounce } from '../utils';

export const usePlaceAutocomplete = () => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlaces = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setPredictions([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const results = await getPlacePredictions(query);  // ✅ Chỉ truyền 1 tham số
        setPredictions(results);
      } catch (err) {
        setError('Không thể tìm kiếm địa điểm');
        console.error(err);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  const clearPredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  return { predictions, loading, error, searchPlaces, clearPredictions };
};