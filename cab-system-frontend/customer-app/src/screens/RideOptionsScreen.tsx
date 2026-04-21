import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RideOptionCard } from '../features/pricing/components/RideOptionCard';
import { PriceBreakdownModal } from '../features/pricing/components/PriceBreakdownModal';
import { useRideOptions } from '../features/pricing/hooks/useRideOptions';
import type { RideOption } from '../features/pricing/types';

export default function RideOptionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as any;
  
  const [selectedOption, setSelectedOption] = useState<RideOption | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const { options, loading, error } = useRideOptions({
    pickupLat: params.pickupLocation?.lat || 0,
    pickupLng: params.pickupLocation?.lng || 0,
    dropoffLat: params.dropoffLocation?.lat || 0,
    dropoffLng: params.dropoffLocation?.lng || 0,
    distance: params.distance || 0,
    duration: params.duration || 0
  });
  
  const handleSelectRide = (option: RideOption) => {
    // Điều hướng sang màn hình xác nhận booking
    navigation.navigate('BookingConfirm', {
      selectedRide: option,
      pickup: params.pickupLocation,
      dropoff: params.dropoffLocation
    });
  };
  
  const handleShowPriceDetail = (option: RideOption) => {
    setSelectedOption(option);
    setModalVisible(true);
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Đang tìm kiếm phương tiện...</Text>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chọn phương tiện</Text>
        <Text style={styles.headerSubtitle}>
          {params.pickupLocation?.address} → {params.dropoffLocation?.address}
        </Text>
      </View>
      
      {/* Danh sách các loại xe */}
      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RideOptionCard
            option={item}
            onPress={handleSelectRide}
            onPressPriceDetail={handleShowPriceDetail}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Modal chi tiết giá */}
      <PriceBreakdownModal
        visible={modalVisible}
        option={selectedOption}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  list: {
    paddingVertical: 8
  },
  loadingText: {
    marginTop: 12,
    color: '#666'
  },
  errorText: {
    color: 'red'
  }
});