import type { Coordinates } from "@cab-booking/shared-types";

export interface MapRoutePoint extends Coordinates {
  label?: string;
}

export function normalizeRoute(points: MapRoutePoint[]) {
  return points.map((point) => ({
    ...point,
    label: point.label?.trim() ?? "",
  }));
}
