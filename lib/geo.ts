"use client";

export function getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

export function formatCoordinates(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return "Location not detected";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function getMapUrl(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function hasValidCoordinates(lat: number | null, lng: number | null): boolean {
  return lat != null && lng != null;
}
