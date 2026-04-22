import { useState, useEffect, useCallback } from "react";
import { rideSocketClient } from "../services/rideSocket";
import { RideStatus, Location, DriverInfo } from "../types/ride.types";

interface UseRideTrackingProps {
  rideId: string;
  initialStatus: RideStatus;
  initialDriver?: DriverInfo;
}

export function useRideTracking({ rideId, initialStatus, initialDriver }: UseRideTrackingProps) {
  const [status, setStatus] = useState<RideStatus>(initialStatus);
  const [driver, setDriver] = useState<DriverInfo | undefined>(initialDriver);
  const [driverLocation, setDriverLocation] = useState<Location | undefined>(initialDriver?.location);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, you'd get the token from your auth store
    rideSocketClient.connect();
    rideSocketClient.joinRide(rideId);

    const unsubLocation = rideSocketClient.onDriverLocation((update) => {
      if (update.rideId === rideId) {
        setDriverLocation(update.location);
      }
    });

    const unsubStatus = rideSocketClient.onRideStatus((update) => {
      if (update.rideId === rideId) {
        setStatus(update.status);
      }
    });

    return () => {
      unsubLocation();
      unsubStatus();
      // rideSocketClient.disconnect(); // Maybe keep connected if used elsewhere
    };
  }, [rideId]);

  return {
    status,
    driver,
    driverLocation,
    error,
  };
}
