// src/services/distanceApi.ts
// Công thức Haversine - tính khoảng cách đường chim bay giữa 2 tọa độ

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateDistanceAndDuration(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): { distance: number; duration: number } {
  // Tính khoảng cách (km)
  const distance = calculateHaversineDistance(originLat, originLng, destLat, destLng);
  
  // Tính thời gian (phút) với giả định tốc độ trung bình 30 km/h
  const avgSpeedKmph = 30;
  const duration = Math.round((distance / avgSpeedKmph) * 60);
  
  return { distance, duration };
}