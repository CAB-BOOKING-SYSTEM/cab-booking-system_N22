// src/features/booking/components/PickupBottomSheet/PickupBottomSheet.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface PickupBottomSheetProps {
  address: string;
  onSetDestination: () => void;
  onHomePress: () => void;
  onWorkPress: () => void;
  loading?: boolean;
}

export const PickupBottomSheet: React.FC<PickupBottomSheetProps> = ({
  address,
  onSetDestination,
  onHomePress,
  onWorkPress,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.handle} />
      
      <View style={styles.addressContainer}>
        <Icon name="location-on" size={24} color="#4CAF50" />
        <Text style={styles.addressText} numberOfLines={1}>
          {loading ? 'Đang xác định vị trí...' : address}
        </Text>
      </View>
      
      <View style={styles.shortcutContainer}>
        <TouchableOpacity style={styles.shortcutButton} onPress={onHomePress}>
          <Icon name="home" size={20} color="#666" />
          <Text style={styles.shortcutText}>Nhà riêng</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.shortcutButton} onPress={onWorkPress}>
          <Icon name="work" size={20} color="#666" />
          <Text style={styles.shortcutText}>Công ty</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[styles.ctaButton, loading && styles.ctaButtonDisabled]} 
        onPress={onSetDestination}
        disabled={loading}
      >
        <Text style={styles.ctaText}>Chọn điểm đến</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  addressText: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
    color: '#333',
  },
  shortcutContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  shortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  shortcutText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  ctaButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  ctaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});