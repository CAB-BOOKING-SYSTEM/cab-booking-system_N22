// src/screens/HomeScreen/HomeScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';

// Components
import { PickupBottomSheet } from '../../features/booking/components/PickupBottomSheet';
import { PickupPin } from '../../features/booking/components/PickupPin';
import { CustomMapView } from '../../features/booking/components/MapView';

// Hooks và Services
import { getAddressFromCoords } from '../../features/booking/services/locationApi';
import { useReverseGeocode } from '../../features/booking/hooks/useReverseGeocode';

// Utils
import { getHomeAddress, getWorkAddress } from '../../features/booking/utils/storage';

// Types
import { RootStackParamList } from '../../app/navigation/types';
import { Coordinates } from '../../features/booking/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region>({
    latitude: 10.762622,
    longitude: 106.660172,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  const [pickupAddress, setPickupAddress] = useState<string>('Đang xác định vị trí...');
  const [pickupCoords, setPickupCoords] = useState<Coordinates>({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState<boolean>(true);

  const { fetchAddress } = useReverseGeocode();

  // Lấy GPS ban đầu
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPickupAddress('Không có quyền truy cập vị trí');
          setLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const newRegion: Region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setRegion(newRegion);
        setPickupCoords({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        
        // Lấy địa chỉ từ GPS
        const address = await getAddressFromCoords({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        
        setPickupAddress(address);

        // 🔍 LOG: Kiểm tra điểm đón ban đầu
        console.log('=== 📍 PICKUP LOCATION (INITIAL) ===');
        console.log('Latitude:', location.coords.latitude);
        console.log('Longitude:', location.coords.longitude);
        console.log('Address:', address);
        console.log('=====================================');
        
      } catch (error) {
        console.error('❌ Lỗi lấy vị trí:', error);
        setPickupAddress('Không thể xác định vị trí');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Khi kéo bản đồ -> Lấy địa chỉ mới
  const handleRegionChangeComplete = async (newRegion: Region): Promise<void> => {
    setRegion(newRegion);
    
    const coords: Coordinates = {
      lat: newRegion.latitude,
      lng: newRegion.longitude,
    };
    
    setPickupCoords(coords);
    
    try {
      const address = await getAddressFromCoords(coords);
      setPickupAddress(address);

      // 🔍 LOG: Kiểm tra điểm đón sau khi kéo bản đồ
      console.log('=== 📍 PICKUP LOCATION (MAP DRAGGED) ===');
      console.log('Latitude:', coords.lat);
      console.log('Longitude:', coords.lng);
      console.log('Address:', address);
      console.log('========================================');
      
    } catch (error) {
      console.error('❌ Lỗi lấy địa chỉ:', error);
    }
  };

  // Xử lý nút Set Destination
  const handleSetDestination = (): void => {
    // 🔍 LOG: Kiểm tra dữ liệu trước khi chuyển màn hình
    console.log('=== 🚗 CHUYỂN SANG CHỌN ĐIỂM ĐẾN ===');
    console.log('Pickup Data gửi đi:');
    console.log('  - Lat:', pickupCoords.lat);
    console.log('  - Lng:', pickupCoords.lng);
    console.log('  - Address:', pickupAddress);
    console.log('=====================================');
    
    navigation.navigate('Destination', {
      pickupLocation: {
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        address: pickupAddress,
      },
    });
  };

  // Xử lý nút Home shortcut
  const handleHomeShortcut = async (): Promise<void> => {
    try {
      const homePlace = await getHomeAddress();
      if (homePlace) {
        const newRegion: Region = {
          latitude: homePlace.geometry.location.lat,
          longitude: homePlace.geometry.location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        mapRef.current?.animateToRegion(newRegion, 1000);
        
        setPickupCoords({
          lat: homePlace.geometry.location.lat,
          lng: homePlace.geometry.location.lng,
        });
        setPickupAddress(homePlace.formatted_address);

        // 🔍 LOG: Kiểm tra khi chọn Home
        console.log('=== 🏠 HOME SHORTCUT ===');
        console.log('Latitude:', homePlace.geometry.location.lat);
        console.log('Longitude:', homePlace.geometry.location.lng);
        console.log('Address:', homePlace.formatted_address);
        console.log('=========================');
        
      } else {
        alert('Bạn chưa thiết lập địa chỉ Nhà riêng. Vào trang Cá nhân để thiết lập.');
      }
    } catch (error) {
      console.error('❌ Lỗi lấy địa chỉ nhà:', error);
    }
  };

  // Xử lý nút Work shortcut
  const handleWorkShortcut = async (): Promise<void> => {
    try {
      const workPlace = await getWorkAddress();
      if (workPlace) {
        const newRegion: Region = {
          latitude: workPlace.geometry.location.lat,
          longitude: workPlace.geometry.location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        mapRef.current?.animateToRegion(newRegion, 1000);
        
        setPickupCoords({
          lat: workPlace.geometry.location.lat,
          lng: workPlace.geometry.location.lng,
        });
        setPickupAddress(workPlace.formatted_address);

        // 🔍 LOG: Kiểm tra khi chọn Work
        console.log('=== 💼 WORK SHORTCUT ===');
        console.log('Latitude:', workPlace.geometry.location.lat);
        console.log('Longitude:', workPlace.geometry.location.lng);
        console.log('Address:', workPlace.formatted_address);
        console.log('========================');
        
      } else {
        alert('Bạn chưa thiết lập địa chỉ Công ty. Vào trang Cá nhân để thiết lập.');
      }
    } catch (error) {
      console.error('❌ Lỗi lấy địa chỉ công ty:', error);
    }
  };

  return (
    <View style={styles.container}>
      <CustomMapView
        ref={mapRef}
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      />
      
      {/* Ghim ở giữa màn hình */}
      <PickupPin />
      
      {/* Bottom Sheet */}
      <PickupBottomSheet
        address={pickupAddress}
        onSetDestination={handleSetDestination}
        onHomePress={handleHomeShortcut}
        onWorkPress={handleWorkShortcut}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    position: 'relative',
  },
});

export default HomeScreen;