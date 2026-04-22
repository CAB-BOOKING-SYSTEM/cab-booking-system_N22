import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import type { RideOption } from '../types';

interface PriceBreakdownModalProps {
  visible: boolean;
  option: RideOption | null;
  onClose: () => void;
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('vi-VN') + 'đ';
};

export function PriceBreakdownModal({ visible, option, onClose }: PriceBreakdownModalProps) {
  if (!option) return null;
  
  // Tính chi tiết giá (giả sử base fare + distance + time)
  // Trong thực tế, nên lấy từ API response chi tiết
  const baseFare = option.originalFare / 3; // Ví dụ
  const distanceCost = option.originalFare / 3;
  const timeCost = option.originalFare / 3;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Chi tiết giá cước</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleIcon}>{option.icon}</Text>
              <Text style={styles.vehicleName}>{option.name}</Text>
            </View>
            
            <View style={styles.breakdown}>
              <View style={styles.row}>
                <Text style={styles.label}>Giá mở cửa</Text>
                <Text style={styles.value}>{formatCurrency(baseFare)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Theo km ({option.distance}km)</Text>
                <Text style={styles.value}>{formatCurrency(distanceCost)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Theo thời gian ({option.etaMinutes}ph)</Text>
                <Text style={styles.value}>{formatCurrency(timeCost)}</Text>
              </View>
              
              {option.isSurge && (
                <View style={styles.surgeRow}>
                  <Text style={styles.label}>Hệ số surge</Text>
                  <Text style={styles.surgeValue}>x{option.surgeMultiplier}</Text>
                </View>
              )}
              
              <View style={styles.divider} />
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalValue}>{formatCurrency(option.fare)}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
            <Text style={styles.closeModalText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  closeButton: {
    fontSize: 24,
    color: '#999'
  },
  content: {
    flex: 1
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  vehicleIcon: {
    fontSize: 32,
    marginRight: 12
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  breakdown: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  label: {
    fontSize: 14,
    color: '#666'
  },
  value: {
    fontSize: 14,
    fontWeight: '500'
  },
  surgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#ffeb3b',
    marginTop: 4,
    paddingHorizontal: 8,
    borderRadius: 4
  },
  surgeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e67e22'
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 12
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e67e22'
  },
  closeModalButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20
  },
  closeModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
