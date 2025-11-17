// Calcula la distancia entre dos puntos usando la fórmula Haversine
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Formatea la distancia en un string legible
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

// Calcula el tiempo estimado según la distancia
export function getEstimatedTime(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.ceil(distanceKm * 12)} min caminando`;
  } else if (distanceKm < 3) {
    return `${Math.ceil(distanceKm * 4)} min en coche`;
  }
  return `${Math.ceil(distanceKm * 2.5)} min en coche`;
}
