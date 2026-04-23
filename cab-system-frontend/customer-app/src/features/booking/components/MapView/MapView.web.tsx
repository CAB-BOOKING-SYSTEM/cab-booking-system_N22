// src/features/booking/components/MapView/MapView.web.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LEAFLET_STYLE_ID = 'cab-leaflet-web-styles';
const LEAFLET_BASE_CSS = `
.leaflet-container { height: 100%; width: 100%; background: #e5e7eb; outline: none; }
.leaflet-pane, .leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow,
.leaflet-tile-container, .leaflet-pane > svg, .leaflet-pane > canvas,
.leaflet-zoom-box, .leaflet-image-layer, .leaflet-layer { position: absolute; left: 0; top: 0; }
.leaflet-tile, .leaflet-marker-icon, .leaflet-marker-shadow { user-select: none; -webkit-user-drag: none; }
.leaflet-pane { z-index: 400; }
.leaflet-tile-pane { z-index: 200; }
.leaflet-overlay-pane { z-index: 400; }
.leaflet-shadow-pane { z-index: 500; }
.leaflet-marker-pane { z-index: 600; }
.leaflet-tooltip-pane { z-index: 650; }
.leaflet-popup-pane { z-index: 700; }
.leaflet-map-pane canvas { z-index: 100; }
.leaflet-map-pane svg { z-index: 200; }
.leaflet-control { position: relative; z-index: 800; pointer-events: auto; }
.leaflet-top, .leaflet-bottom { position: absolute; z-index: 1000; pointer-events: none; }
.leaflet-top { top: 0; }
.leaflet-right { right: 0; }
.leaflet-bottom { bottom: 0; }
.leaflet-left { left: 0; }
.leaflet-control-zoom { margin: 12px; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.leaflet-control-zoom a { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: #fff; color: #111827; text-decoration: none; font-weight: 700; }
.leaflet-control-zoom a + a { border-top: 1px solid rgba(0,0,0,0.08); }
.leaflet-control-attribution { margin: 0 8px 8px 0; padding: 2px 6px; background: rgba(255,255,255,0.85); font-size: 11px; border-radius: 4px; }
`;

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

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (!document.getElementById(LEAFLET_STYLE_ID)) {
      const styleTag = document.createElement('style');
      styleTag.id = LEAFLET_STYLE_ID;
      styleTag.textContent = LEAFLET_BASE_CSS;
      document.head.appendChild(styleTag);
    }

    return undefined;
  }, []);

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
