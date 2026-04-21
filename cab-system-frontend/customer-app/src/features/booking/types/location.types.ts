// src/features/booking/types/location.types.ts
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  coordinates: Coordinates;
  address: string;
  name?: string;
  placeId?: string;
}

export interface PickupLocation extends Location {}

export interface DropoffLocation extends Location {}