// ============================================================
// RESQ — Map Marker SVG Generators & High-Legibility Badges
// ============================================================

import L from 'leaflet';
import { AGENCY_COLORS, getSeverityColor } from './mapStyles';
import { HelpingPoint, Zone } from '../../types';

/**
 * 1. Dropped Disaster Pin SVG (Matches the uploaded reference image)
 * Teardrop red pin with white circular cutout hole, 3D shading, and ground ripple.
 */
export const createDroppedPinIconHtml = (severityLevel = 'critical') => {
  const colors = getSeverityColor(severityLevel);

  return `
    <div class="pin-drop-anim" style="position: relative; width: 44px; height: 56px; pointer-events: none; filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));">
      <!-- Ground Ripple Effect at the point of contact -->
      <div class="ground-ripple-anim" style="
        position: absolute;
        left: 22px;
        bottom: 2px;
        width: 28px;
        height: 12px;
        background: ${colors.stroke}55;
        border-radius: 50%;
        pointer-events: none;
      "></div>

      <!-- Precision SVG Location Pin (Red Teardrop with White Center Hole) -->
      <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pinGrad" x1="22" y1="2" x2="22" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="${colors.stroke}"/>
            <stop offset="100%" stop-color="#991B1B"/>
          </linearGradient>
          <filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000000" flood-opacity="0.25"/>
          </filter>
        </defs>

        <!-- Main Teardrop Pin Body -->
        <path d="M22 2C10.95 2 2 10.95 2 22C2 34.6 20.2 53.6 21.2 54.6C21.6 55.1 22.4 55.1 22.8 54.6C23.8 53.6 42 34.6 42 22C42 10.95 33.05 2 22 2Z" fill="url(#pinGrad)"/>
        
        <!-- 3D Contour Shade on the right edge -->
        <path d="M22 2C27.8 2 33 4.5 36.8 8.4C40.2 12.2 42 16.9 42 22C42 34.6 23.8 53.6 22.8 54.6C22.6 54.8 22.3 55 22 55V2Z" fill="#7F1D1D" opacity="0.32"/>
        
        <!-- White Circular Cutout Hole (Reference Image Feature) -->
        <circle cx="22" cy="21" r="8" fill="#FFFFFF" filter="url(#innerGlow)"/>
      </svg>
    </div>
  `;
};

/**
 * Leaflet DivIcon for Dropped Pin
 */
export const getDroppedPinLeafletIcon = (severityLevel = 'critical') => {
  return L.divIcon({
    className: 'resq-dropped-pin-icon',
    html: createDroppedPinIconHtml(severityLevel),
    iconSize: [44, 56],
    iconAnchor: [22, 54], // Exact tip of the pin
    popupAnchor: [0, -50],
  });
};

/**
 * 2. Decisive Helping Point (Depot) Marker
 * Unmistakable deep blue / agency colored pin with a white shelter/depot icon
 * plus an attached pill label so it stands out immediately as a resource hub.
 */
export const createHelpingPointIconHtml = (point: HelpingPoint) => {
  const color = AGENCY_COLORS[point.type] || '#2563EB';

  return `
    <div class="helping-point-marker" style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <!-- Permanent High-Legibility Depot Pill Label -->
      <div style="
        position: absolute;
        bottom: 46px;
        white-space: nowrap;
        background: #0F172A;
        color: #FFFFFF;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 3px 8px;
        border-radius: 9999px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
        border: 1.5px solid #FFFFFF;
        display: flex;
        align-items: center;
        gap: 4px;
        pointer-events: none;
      ">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
        <span>${point.name.replace(' Depot', '').replace(' Regional Hub', '')}</span>
      </div>

      <!-- Decisive Helping Point Pin -->
      <div style="position: relative; width: 38px; height: 48px; filter: drop-shadow(0 4px 10px rgba(37, 99, 235, 0.45));">
        <!-- SVG Blue Pin with Shelter/Depot Icon inside -->
        <svg width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pin Body -->
          <path d="M19 2C9.6 2 2 9.6 2 19C2 29.8 17.5 45.8 18.3 46.7C18.7 47.1 19.3 47.1 19.7 46.7C20.5 45.8 36 29.8 36 19C36 9.6 28.4 2 19 2Z" fill="${color}"/>
          <!-- Darker shade on right -->
          <path d="M19 2C24 2 28.5 4.2 31.7 7.5C34.5 10.7 36 14.7 36 19C36 29.8 20.5 45.8 19.7 46.7C19.5 46.9 19.3 47 19 47V2Z" fill="#1E3A8A" opacity="0.3"/>
          <!-- White Circular Medallion -->
          <circle cx="19" cy="18" r="9.5" fill="#FFFFFF"/>
        </svg>

        <!-- Warehouse / Depot Icon in center of medallion -->
        <div style="
          position: absolute;
          top: 8.5px;
          left: 9.5px;
          width: 19px;
          height: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${color};
          font-size: 11px;
          font-weight: 900;
        ">
          🏢
        </div>
      </div>
    </div>
  `;
};

/**
 * Leaflet DivIcon for Helping Point
 */
export const getHelpingPointLeafletIcon = (point: HelpingPoint) => {
  return L.divIcon({
    className: 'resq-helping-point-icon',
    html: createHelpingPointIconHtml(point),
    iconSize: [38, 48],
    iconAnchor: [19, 46], // Bottom tip of the pin
    popupAnchor: [0, -44],
  });
};

/**
 * 3. Saved Zone Center Marker (Visual confirmation of active zone center)
 */
export const createSavedZoneCenterHtml = (zone: Zone) => {
  const colors = getSeverityColor(zone.severity_level);

  return `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <div style="
        padding: 4px 8px;
        background: #FFFFFF;
        border: 2px solid ${colors.stroke};
        border-radius: 9999px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 5px;
        font-family: 'Poppins', sans-serif;
      ">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${colors.stroke};"></span>
        <span style="font-size: 11px; font-weight: 800; color: #0F172A; white-space: nowrap;">${zone.name}</span>
        <span style="font-size: 9px; font-weight: 700; color: ${colors.stroke}; background: ${colors.badgeBg}; padding: 1px 5px; border-radius: 4px; text-transform: uppercase;">
          ${(zone.radius_m / 1000).toFixed(1)} km
        </span>
      </div>
    </div>
  `;
};

export const getSavedZoneCenterLeafletIcon = (zone: Zone) => {
  return L.divIcon({
    className: 'resq-zone-center-icon',
    html: createSavedZoneCenterHtml(zone),
    iconSize: [120, 28],
    iconAnchor: [60, 14],
    popupAnchor: [0, -14],
  });
};
