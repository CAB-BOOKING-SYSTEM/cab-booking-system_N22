// src/features/booking/services/locationApi.ts
import { Coordinates, PlaceDetails, NearbyPlace } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const HEADERS = {
  'User-Agent': 'CabBookingApp/1.0 (student project)',
  'Accept-Language': 'vi',
};

// Reverse Geocode: Từ tọa độ ra địa chỉ
export const getAddressFromCoords = async (coords: Coordinates): Promise<string> => {
  try {
    const response = await fetch(
      `${NOMINATIM_URL}/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1`,
      { headers: HEADERS }
    );
    const data = await response.json();
    
    if (data && data.display_name) {
      return data.display_name;
    }
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  }
};

// Place Autocomplete: Gợi ý địa chỉ khi gõ
export const getPlacePredictions = async (query: string): Promise<any[]> => {
  try {
    const response = await fetch(
      `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10&countrycodes=vn`,
      { headers: HEADERS }
    );
    const data = await response.json();
    
    return data.map((item: any, index: number) => ({
      place_id: String(item.osm_id || item.place_id || index),  // ✅ Đảm bảo là string
      description: item.display_name,
      structured_formatting: {
        main_text: item.name || item.display_name?.split(',')[0] || 'Unknown',
        secondary_text: item.display_name?.split(',').slice(1).join(',').trim() || '',
      },
      // ✅ Lưu thêm thông tin geometry để dùng ngay
      geometry: {
        location: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
      },
      // Lưu thêm địa chỉ đầy đủ
      formatted_address: item.display_name,
      name: item.name || item.display_name?.split(',')[0] || 'Unknown',
    }));
  } catch (error) {
    console.error('Place autocomplete error:', error);
    return [];
  }
};

// Get Place Details: Lấy chi tiết tọa độ từ place (đã sửa để xử lý object)
export const getPlaceDetails = async (place: any): Promise<PlaceDetails | null> => {
  try {
    // ✅ Nếu place đã có geometry, dùng luôn
    if (place.geometry && place.geometry.location) {
      return {
        place_id: String(place.place_id),
        name: place.name || place.structured_formatting?.main_text || 'Unknown',
        formatted_address: place.formatted_address || place.description || '',
        geometry: {
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
        },
        vicinity: place.vicinity || '',
        types: place.types || [],
      };
    }

    // ✅ Nếu chỉ có place_id, gọi API để lấy chi tiết
    const placeId = typeof place === 'string' ? place : String(place.place_id);
    
    // Với Nominatim, dùng search thay vì lookup
    const response = await fetch(
      `${NOMINATIM_URL}/search?q=${encodeURIComponent(place.description || placeId)}&format=json&addressdetails=1&limit=1`,
      { headers: HEADERS }
    );
    const data = await response.json();
    
    if (data && data[0]) {
      const item = data[0];
      return {
        place_id: String(item.osm_id || item.place_id),
        name: item.name || item.display_name?.split(',')[0] || 'Unknown',
        formatted_address: item.display_name,
        geometry: {
          location: {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          },
        },
        vicinity: item.address?.road || item.address?.suburb || '',
        types: [item.type],
      };
    }
    return null;
  } catch (error) {
    console.error('Place details error:', error);
    return null;
  }
};

// Nearby Places: Địa điểm gợi ý gần đây
export const getNearbyPlaces = async (coords: Coordinates): Promise<NearbyPlace[]> => {
  try {
    const response = await fetch(
      `${NOMINATIM_URL}/search?q=restaurant|cafe|shop&format=json&limit=10&lat=${coords.lat}&lon=${coords.lng}&bounded=1&viewbox=${coords.lng - 0.01},${coords.lat + 0.01},${coords.lng + 0.01},${coords.lat - 0.01}`,
      { headers: HEADERS }
    );
    const data = await response.json();
    
    return data.map((item: any) => ({
      place_id: String(item.osm_id),
      name: item.name || item.display_name?.split(',')[0] || 'Unknown',
      formatted_address: item.display_name,
      geometry: {
        location: {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        },
      },
      vicinity: item.address?.road || item.address?.suburb || '',
      types: [item.type],
    }));
  } catch (error) {
    console.error('Nearby places error:', error);
    return [];
  }
};