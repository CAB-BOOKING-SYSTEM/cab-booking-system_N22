// src/app/navigation/types.ts
export type RootStackParamList = {
  Home: undefined;
  Destination: {
    pickupLocation: {
      lat: number;
      lng: number;
      address: string;
    };
  };
  VehicleSelection: {
    pickupLocation: {
      lat: number;
      lng: number;
      address: string;
    };
    dropoffLocation: {
      lat: number;
      lng: number;
      address: string;
      name?: string;
    };
  };
};