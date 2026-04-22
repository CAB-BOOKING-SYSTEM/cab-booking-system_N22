// src/features/booking/components/PickupPin/PickupPin.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const PickupPin = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      <Icon name="location-on" size={40} color="#4CAF50" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
  },
});