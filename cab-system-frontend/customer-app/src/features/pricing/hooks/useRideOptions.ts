import { useEffect, useState } from 'react';
import { getVehicleTypes, calculateEstimate } from '../api/pricingApi';
import type { RideOption } from '../types';

// Map loại xe từ API sang UI
const getVehicleInfo = (type: string) => {
  const map: Record<string, { name: string; icon: string; capacity: number }> = {
    bike: { name: 'Xe máy', icon: '🏍️', capacity: 1 },
    car: { name: 'Xe 4 chỗ', icon: '🚗', capacity: 4 },
    suv: { name: 'Xe 7 chỗ', icon: '🚙', capacity: 7 }
  };
  return map[type] || { name: type, icon: '🚗', capacity: 4 };
};

interface UseRideOptionsProps {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distance: number;
  duration: number;
}

export function useRideOptions({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  distance,
  duration
}: UseRideOptionsProps) {
  const [options, setOptions] = useState<RideOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Lấy danh sách loại xe từ Pricing Service
        const vehicleTypes = await getVehicleTypes();
        
        // 2. Tính giá cho từng loại xe
        const results = await Promise.all(
          vehicleTypes.map(async (vehicle) => {
            try {
              const estimate = await calculateEstimate({
                pickupLocation: { lat: pickupLat, lng: pickupLng },
                dropoffLocation: { lat: dropoffLat, lng: dropoffLng },
                vehicleType: vehicle.vehicle_type,
                distance,
                duration
              });
              
              const { name, icon, capacity } = getVehicleInfo(estimate.vehicleType);
              
              return {
                id: estimate.vehicleType,
                name,
                icon,
                capacity,
                fare: estimate.estimatedFare,
                originalFare: estimate.estimatedFare / estimate.surgeMultiplier,
                surgeMultiplier: estimate.surgeMultiplier,
                etaMinutes: estimate.duration,
                distance: estimate.distance,
                isSurge: estimate.surgeMultiplier > 1.0
              };
            } catch (err) {
              console.error(`Lỗi tính giá cho ${vehicle.vehicle_type}:`, err);
              return null;
            }
          })
        );
        
        setOptions(results.filter((r): r is RideOption => r !== null));
      } catch (err) {
        setError('Không thể tải danh sách xe');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (pickupLat && dropoffLat && distance > 0) {
      loadOptions();
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, distance, duration]);

  return { options, loading, error };
}
