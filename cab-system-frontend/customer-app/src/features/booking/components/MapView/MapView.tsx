// src/features/booking/components/MapView/MapView.tsx
import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import RNMapView, { MapViewProps, PROVIDER_DEFAULT, Region } from 'react-native-maps';

interface CustomMapViewProps extends Omit<MapViewProps, 'onRegionChangeComplete'> {
  onRegionChangeComplete?: (region: Region) => void;
}

export const CustomMapView = forwardRef<RNMapView, CustomMapViewProps>((props, ref) => {
  return (
    <RNMapView
      ref={ref}
      provider={PROVIDER_DEFAULT}  // ✅ Dùng OpenStreetMap (miễn phí)
      style={[styles.map, props.style]}
      showsUserLocation={props.showsUserLocation ?? true}
      showsMyLocationButton={props.showsMyLocationButton ?? false}
      loadingEnabled={true}
      {...props}
    />
  );
});

CustomMapView.displayName = 'CustomMapView';

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});