// src/features/booking/components/MapView/index.ts
import { Platform } from 'react-native';

let CustomMapView: any;

if (Platform.OS === 'web') {
  CustomMapView = require('./MapView.web').CustomMapView;
} else {
  CustomMapView = require('./MapView.native').CustomMapView;
}

export { CustomMapView };