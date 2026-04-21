import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { RideOption } from '../types';

interface RideOptionCardProps {
  option: RideOption;
  onPress: (option: RideOption) => void;
  onPressPriceDetail: (option: RideOption) => void;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('vi-VN') + 'đ';
};

export function RideOptionCard({ option, onPress, onPressPriceDetail }: RideOptionCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(option)}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{option.icon}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.vehicleName}>{option.name}</Text>
          <Text style={styles.capacity}>{option.capacity} chỗ</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.eta}>⏱️ {option.etaMinutes} phút</Text>
          <Text style={styles.distance}>📏 {option.distance} km</Text>
        </View>
        
        {option.isSurge && (
          <View style={styles.surgeBadge}>
            <Text style={styles.surgeText}>
              ⚠️ Giá đang tăng {option.surgeMultiplier}x
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.priceContainer}>
        <Text style={styles.price}>{formatCurrency(option.fare)}</Text>
        {option.isSurge && (
          <Text style={styles.originalPrice}>
            {formatCurrency(option.originalFare)}
          </Text>
        )}
        <TouchableOpacity onPress={() => onPressPriceDetail(option)}>
          <Text style={styles.detailLink}>Chi tiết</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  iconContainer: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center'
  },
  icon: {
    fontSize: 40
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  capacity: {
    fontSize: 14,
    color: '#666'
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 4
  },
  eta: {
    fontSize: 14,
    color: '#666',
    marginRight: 12
  },
  distance: {
    fontSize: 14,
    color: '#666'
  },
  surgeBadge: {
    backgroundColor: '#ffeb3b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start'
  },
  surgeText: {
    fontSize: 12,
    color: '#e67e22',
    fontWeight: 'bold'
  },
  priceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e67e22'
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through'
  },
  detailLink: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 4
  }
});