import React, { useRef, useEffect } from "react";
import { StyleSheet, View, Platform, Text } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Location, RideStatus } from "../types/ride.types";

interface RideTrackingMapProps {
  driverLocation?: Location;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: RideStatus;
}

export function RideTrackingMap({
  driverLocation,
  pickupLocation,
  dropoffLocation,
  status,
}: RideTrackingMapProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current) {
      const coordinates = [pickupLocation, dropoffLocation];
      if (driverLocation) {
        coordinates.push(driverLocation);
      }
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  }, [driverLocation, status]);

  // For web development, use Leaflet
  if (Platform.OS === 'web') {
    const { MapContainer, TileLayer, Marker: LeafletMarker, Polyline: LeafletPolyline, Popup } = require('react-leaflet');
    const L = require('leaflet');

    // Fix icon issue
    const driverIcon = L.divIcon({
      html: '<div style="font-size: 24px;">🚗</div>',
      className: 'driver-marker-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const pickupIcon = L.divIcon({
      html: '<div style="font-size: 24px;">📍</div>',
      className: 'pickup-marker-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const dropoffIcon = L.divIcon({
      html: '<div style="font-size: 24px;">🏁</div>',
      className: 'dropoff-marker-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    const center = [pickupLocation.latitude, pickupLocation.longitude];

    return (
      <View style={styles.map}>
        <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <LeafletMarker position={[pickupLocation.latitude, pickupLocation.longitude]} icon={pickupIcon}>
            <Popup>Điểm đón</Popup>
          </LeafletMarker>

          <LeafletMarker position={[dropoffLocation.latitude, dropoffLocation.longitude]} icon={dropoffIcon}>
            <Popup>Điểm đến</Popup>
          </LeafletMarker>

          {driverLocation && (
            <LeafletMarker position={[driverLocation.latitude, driverLocation.longitude]} icon={driverIcon}>
              <Popup>Tài xế đang đến</Popup>
            </LeafletMarker>
          )}

          <LeafletPolyline 
            positions={[
              [pickupLocation.latitude, pickupLocation.longitude],
              [dropoffLocation.latitude, dropoffLocation.longitude]
            ]} 
            color="#4CAF50" 
          />
        </MapContainer>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {/* Pickup Marker */}
      <Marker
        coordinate={pickupLocation}
        title="Điểm đón"
        pinColor="green"
      />

      {/* Dropoff Marker */}
      <Marker
        coordinate={dropoffLocation}
        title="Điểm đến"
        pinColor="red"
      />

      {/* Driver Marker */}
      {driverLocation && (
        <Marker
          coordinate={driverLocation}
          title="Tài xế"
          description="Đang di chuyển"
        >
          <View style={styles.driverMarker}>
            <Text style={{ fontSize: 24 }}>🚗</Text>
          </View>
        </Marker>
      )}

      {/* Route Polyline (Mocked or actual if you have points) */}
      <Polyline
        coordinates={[pickupLocation, dropoffLocation]}
        strokeWidth={4}
        strokeColor="#4CAF50"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  webPlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  driverMarker: {
    backgroundColor: 'white',
    padding: 4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});
