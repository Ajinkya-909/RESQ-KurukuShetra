// ============================================================
// RESQ — Real-World OSRM Road Routing Service with In-Memory Caching
// ============================================================

export interface LatLng {
  lat: number;
  lng: number;
}

export interface HazardPoint {
  lat: number;
  lng: number;
  radiusMeters?: number;
}

// In-memory cache to ensure zero redundant network requests for identical origin-destination pairs & hazard configurations
const routeCache = new Map<string, LatLng[]>();

/**
 * Calculates perpendicular distance (in degrees approx) and projection factor t
 * of point C relative to segment AB.
 */
function getPerpendicularDistance(
  Ax: number, Ay: number,
  Bx: number, By: number,
  Cx: number, Cy: number
): { distanceDeg: number; t: number } {
  const dx = Bx - Ax;
  const dy = By - Ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dist = Math.hypot(Cx - Ax, Cy - Ay);
    return { distanceDeg: dist, t: 0 };
  }

  // Projection factor t along line segment AB
  const t = Math.max(0, Math.min(1, ((Cx - Ax) * dx + (Cy - Ay) * dy) / lenSq));
  const projX = Ax + t * dx;
  const projY = Ay + t * dy;

  const distanceDeg = Math.hypot(Cx - projX, Cy - projY);
  return { distanceDeg, t };
}

/**
 * Checks if a hazard point sits directly on the trajectory between A and B,
 * and if so, returns a detour waypoint that routes around the hazard.
 */
function calculateDetourWaypoint(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  hazards: HazardPoint[]
): LatLng | null {
  if (!hazards || hazards.length === 0) return null;

  for (const hazard of hazards) {
    // 1. Skip if destination IS the hazard (or start is the hazard) within ~300 meters (~0.003 deg)
    const distToDest = Math.hypot(toLat - hazard.lat, toLng - hazard.lng);
    const distToStart = Math.hypot(fromLat - hazard.lat, fromLng - hazard.lng);
    if (distToDest < 0.004 || distToStart < 0.004) {
      continue;
    }

    // 2. Check position along segment (must be strictly between 15% and 85% of segment path)
    const { distanceDeg, t } = getPerpendicularDistance(
      fromLng, fromLat,
      toLng, toLat,
      hazard.lng, hazard.lat
    );

    // Hazard influence threshold (~1.5 km or 0.015 degrees)
    const maxHazardDist = 0.015;

    if (t > 0.15 && t < 0.85 && distanceDeg < maxHazardDist) {
      // Point C obstructs route A->B! Calculate detour waypoint D offset perpendicular to segment AB.
      const dx = toLng - fromLng;
      const dy = toLat - fromLat;
      const segLen = Math.hypot(dx, dy);

      if (segLen === 0) continue;

      // Normal vector (perp to AB)
      const nx = -dy / segLen;
      const ny = dx / segLen;

      // Choose side of normal vector that pushes further away from hazard center or defaults to +1
      const offsetDist = maxHazardDist + 0.018; // ~2km detour radius around hazard
      
      const detour1 = { lat: hazard.lat + ny * offsetDist, lng: hazard.lng + nx * offsetDist };
      const detour2 = { lat: hazard.lat - ny * offsetDist, lng: hazard.lng - nx * offsetDist };

      // Return detour waypoint that stays on the side of the original line
      const dist1 = Math.hypot(detour1.lat - (fromLat + toLat)/2, detour1.lng - (fromLng + toLng)/2);
      const dist2 = Math.hypot(detour2.lat - (fromLat + toLat)/2, detour2.lng - (fromLng + toLng)/2);

      return dist1 < dist2 ? detour1 : detour2;
    }
  }

  return null;
}

/**
 * Fetches real-world driving route waypoints between fromLat/fromLng and toLat/toLng
 * using OSRM public routing engine.
 * Dynamically detours around intermediate hazards (Point C) between Point A and B.
 */
export async function fetchRoadRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  hazards: HazardPoint[] = []
): Promise<LatLng[]> {
  const fallbackPath: LatLng[] = [
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng },
  ];

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return fallbackPath;
  }

  // Detect if an intermediate hazard is blocking the direct path A -> B
  const detourPoint = calculateDetourWaypoint(fromLat, fromLng, toLat, toLng, hazards);

  const detourKey = detourPoint ? `|detour:${detourPoint.lat.toFixed(4)},${detourPoint.lng.toFixed(4)}` : '';
  const cacheKey = `${fromLat.toFixed(4)},${fromLng.toFixed(4)}->${toLat.toFixed(4)},${toLng.toFixed(4)}${detourKey}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    let url: string;
    if (detourPoint) {
      // 3-waypoint route: A -> Detour Waypoint D -> B
      url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${detourPoint.lng},${detourPoint.lat};${toLng},${toLat}?overview=full&geometries=geojson`;
    } else {
      // Standard 2-waypoint route: A -> B
      url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      if (detourPoint) {
        return [{ lat: fromLat, lng: fromLng }, detourPoint, { lat: toLat, lng: toLng }];
      }
      return fallbackPath;
    }

    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const coords: Array<[number, number]> = data.routes[0].geometry.coordinates; // [[lng, lat], ...]
      const roadWaypoints: LatLng[] = coords.map(([lng, lat]) => ({ lat, lng }));

      routeCache.set(cacheKey, roadWaypoints);
      return roadWaypoints;
    }
  } catch {
    // Graceful fallback
    if (detourPoint) {
      return [{ lat: fromLat, lng: fromLng }, detourPoint, { lat: toLat, lng: toLng }];
    }
  }

  return fallbackPath;
}
