// src/features/booking/components/MapView/MapView.web.tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onRegionChangeComplete?: (region: any) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  style?: any;
}

const MapController: React.FC<{ onMoveEnd?: (region: any) => void }> = ({ onMoveEnd }) => {
  const map = useMapEvents({
    moveend: () => {
      if (onMoveEnd) {
        const center = map.getCenter();
        const bounds = map.getBounds();
        onMoveEnd({
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()),
          longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()),
        });
      }
    },
  });
  return null;
};

export const CustomMapView = forwardRef<any, MapViewProps>((props, ref) => {
  const { region, onRegionChangeComplete, style } = props;
  const mapRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (newRegion: any, duration: number) => {
      if (mapRef.current) {
        mapRef.current.setView(
          [newRegion.latitude, newRegion.longitude],
          Math.round(Math.log2(360 / newRegion.longitudeDelta)),
          { animate: true, duration }
        );
      }
    },
  }));

  const defaultCenter: [number, number] = [
    region?.latitude || 10.762622,
    region?.longitude || 106.660172,
  ];
  
  const defaultZoom = region ? Math.round(Math.log2(360 / region.longitudeDelta)) : 15;

  return (
    <View style={[styles.container, style]}>
      <MapContainer
        ref={mapRef}
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController onMoveEnd={onRegionChangeComplete} />
      </MapContainer>
    </View>
  );
});

CustomMapView.displayName = 'CustomMapView';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
});