// ============================================================
// RESQ — Map Constants, Severity Colors & Clean Light Theme
// ============================================================

export const DEFAULT_MAP_CENTER = {
  lat: 18.5204,
  lng: 73.8567, // Pune, Maharashtra, India
};

export const DEFAULT_MAP_ZOOM = 12.5;

// Light Theme Tile Layer: CartoDB Voyager (Crisp, High-Legibility, Modern Light Tiles)
export const VOYAGER_LIGHT_TILES = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
};

// Severity Color Mapping (Vibrant, high-contrast on light maps)
export const SEVERITY_COLORS: Record<string, { stroke: string; fill: string; badgeBg: string; badgeText: string }> = {
  critical: {
    stroke: '#DC2626',
    fill: 'rgba(239, 68, 68, 0.25)',
    badgeBg: '#FEE2E2',
    badgeText: '#991B1B',
  },
  high: {
    stroke: '#EA580C',
    fill: 'rgba(249, 115, 22, 0.22)',
    badgeBg: '#FFEDD5',
    badgeText: '#9A3412',
  },
  moderate: {
    stroke: '#D97706',
    fill: 'rgba(245, 158, 11, 0.20)',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
  low: {
    stroke: '#059669',
    fill: 'rgba(16, 185, 129, 0.18)',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
  },
};

export const getSeverityColor = (level?: string) => {
  const normalized = (level || 'low').toLowerCase();
  return SEVERITY_COLORS[normalized] || SEVERITY_COLORS.low;
};

// Agency Hub Colors
export const AGENCY_COLORS: Record<string, string> = {
  govt: '#2563EB',     // NDRF / Govt (Blue)
  military: '#059669', // Army / Military (Emerald/Olive)
  hospital: '#E11D48', // Hospital / Medical (Rose/Red)
  ngo: '#EA580C',      // Red Cross / NGO (Orange)
  private: '#0891B2',  // Volunteers (Cyan)
};

// Clean Google Maps Light Theme (Soft contrast, crisp street names)
export const GOOGLE_MAPS_LIGHT_STYLE: any[] = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#cce3f5' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f5f7f9' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#fde68a' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#eef2f6' }],
  },
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }, { weight: 1 }],
  },
  {
    featureType: 'administrative',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }, { weight: 3 }],
  },
];
