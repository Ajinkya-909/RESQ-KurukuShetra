import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { TacticalMapProps } from './types';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  VOYAGER_LIGHT_TILES,
  getSeverityColor,
  AGENCY_COLORS,
} from './mapStyles';
import {
  getDroppedPinLeafletIcon,
  getHelpingPointLeafletIcon,
  getSavedZoneCenterLeafletIcon,
} from './markerIcons';


import { fetchRoadRoute } from './routeService';

interface ResolvedLeafletSupplyLine {
  allocation_id: number;
  status: string;
  path: Array<[number, number]>;
}

export const LeafletMapEngine: React.FC<TacticalMapProps> = ({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  zones = [],
  helpingPoints = [],
  reports = [],
  supplyLines = [],
  tempZone = null,
  activeLayers = { zones: true, depots: true, reports: true, supplyLines: true },
  onMapClick,
  onZoneClick,
  onPointClick,
  onReportClick,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Resolved Real-World Road Routes for Leaflet
  const [resolvedSupplyLines, setResolvedSupplyLines] = useState<ResolvedLeafletSupplyLine[]>([]);

  useEffect(() => {
    if (!activeLayers.supplyLines || supplyLines.length === 0) {
      setResolvedSupplyLines([]);
      return;
    }

    let isMounted = true;

    // Collect all active hazard locations (disaster zones and SOS reports)
    const activeHazards = [
      ...zones.map((z) => ({ lat: z.center_lat, lng: z.center_lng })),
      ...reports.map((r) => ({ lat: r.lat, lng: r.lng })),
    ];

    const resolveRoutes = async () => {
      const resolved = await Promise.all(
        supplyLines.map(async (line) => {
          const waypoints = await fetchRoadRoute(
            line.from_lat,
            line.from_lng,
            line.to_lat,
            line.to_lng,
            activeHazards
          );
          return {
            allocation_id: line.allocation_id,
            status: line.status,
            path: waypoints.map((pt) => [pt.lat, pt.lng] as [number, number]),
          };
        })
      );

      if (isMounted) {
        setResolvedSupplyLines(resolved);
      }
    };

    resolveRoutes();
    return () => {
      isMounted = false;
    };
  }, [supplyLines, activeLayers.supplyLines, zones, reports]);

  // Layer groups
  const zonesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const depotsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const reportsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const supplyLinesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const tempZoneLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // 1. Initialize Leaflet Map Instance with Light Tiles
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: false,
    });

    // Zoom control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Modern Light Voyager Tiles
    L.tileLayer(VOYAGER_LIGHT_TILES.url, {
      attribution: VOYAGER_LIGHT_TILES.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Create custom map panes for explicit z-index hierarchy
    const supplyPane = map.createPane('supplyLinesPane');
    supplyPane.style.zIndex = '400';

    const zonesPane = map.createPane('zonesPane');
    zonesPane.style.zIndex = '450';

    const depotsPane = map.createPane('depotsPane');
    depotsPane.style.zIndex = '600';

    const reportsPane = map.createPane('reportsPane');
    reportsPane.style.zIndex = '650';

    // Attach layer groups
    zonesLayerRef.current = L.layerGroup([], { pane: 'zonesPane' }).addTo(map);
    depotsLayerRef.current = L.layerGroup([], { pane: 'depotsPane' }).addTo(map);
    reportsLayerRef.current = L.layerGroup([], { pane: 'reportsPane' }).addTo(map);
    supplyLinesLayerRef.current = L.layerGroup([], { pane: 'supplyLinesPane' }).addTo(map);
    tempZoneLayerRef.current = L.layerGroup([], { pane: 'zonesPane' }).addTo(map);

    // Map Click Listener — robust click capture
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);



  // Update center when prop changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [center.lat, center.lng, zoom]);

  // 2. Render Saved Zones
  useEffect(() => {
    zonesLayerRef.current.clearLayers();
    if (!activeLayers.zones) return;

    zones.forEach((zone) => {
      const colors = getSeverityColor(zone.severity_level);
      const circle = L.circle([zone.center_lat, zone.center_lng], {
        radius: zone.radius_m,
        color: colors.stroke,
        weight: 2.5,
        fillColor: colors.stroke,
        fillOpacity: 0.22,
        bubblingMouseEvents: true, // Allows clicking inside to still trigger map placement
      });

      circle.bindPopup(`
        <div class="p-2.5 text-slate-900 font-sans">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full" style="background:${colors.stroke}"></span>
            <p class="font-bold text-sm">${zone.name}</p>
          </div>
          <p class="text-xs text-slate-600 mt-1">Severity: <span class="font-bold uppercase" style="color:${colors.stroke}">${zone.severity_level}</span></p>
          <p class="text-xs text-slate-500">Radius: ${(zone.radius_m / 1000).toFixed(1)} km</p>
          <p class="text-xs text-slate-500">Population: ${zone.population_estimate?.toLocaleString() || 0}</p>
        </div>
      `);

      circle.on('click', () => onZoneClick?.(zone));
      zonesLayerRef.current.addLayer(circle);

      // Center pill tag for zone
      const centerLabel = L.marker([zone.center_lat, zone.center_lng], {
        icon: getSavedZoneCenterLeafletIcon(zone),
        bubblingMouseEvents: true,
      });
      centerLabel.on('click', () => onZoneClick?.(zone));
      zonesLayerRef.current.addLayer(centerLabel);
    });
  }, [zones, activeLayers.zones]);

  // 3. Render Temp Zone Preview with Visual Dropped Pin & Real-time Radius Circle
  useEffect(() => {
    tempZoneLayerRef.current.clearLayers();
    if (!tempZone) return;

    const colors = getSeverityColor(tempZone.severity_level);

    // A. Dynamic Radius Preview Circle (interactive: false so clicks pass right through)
    const circle = L.circle([tempZone.center_lat, tempZone.center_lng], {
      radius: tempZone.radius_m,
      color: colors.stroke,
      weight: 3,
      dashArray: '8, 8',
      fillColor: colors.stroke,
      fillOpacity: 0.22,
      interactive: false, // Prevents intercepting mouse clicks
    });
    tempZoneLayerRef.current.addLayer(circle);

    // B. Dropped Pin Marker (Matching user's red teardrop icon with center hole & ground ripple)
    const centerMarker = L.marker([tempZone.center_lat, tempZone.center_lng], {
      icon: getDroppedPinLeafletIcon(tempZone.severity_level),
      interactive: false,
    });
    tempZoneLayerRef.current.addLayer(centerMarker);

    // C. Live Radius Measurement Badge (Hovering at the top perimeter of the circle)
    // Approximate latitude offset for radius_m meters: 1 deg lat ~= 111,320m
    const latOffset = tempZone.radius_m / 111320;
    const radiusTagIcon = L.divIcon({
      className: 'temp-zone-radius-tag',
      html: `
        <div style="
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #0F172A;
          color: #FFFFFF;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.02em;
          border-radius: 9999px;
          border: 1.5px solid ${colors.stroke};
          box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          white-space: nowrap;
          pointer-events: none;
        ">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${colors.stroke};"></span>
          <span>Radius: ${(tempZone.radius_m / 1000).toFixed(1)} km</span>
          <span style="color: #94A3B8; font-size: 9px; font-mono font-bold;">(${tempZone.radius_m}m)</span>
        </div>
      `,
      iconSize: [160, 26],
      iconAnchor: [80, 13],
    });

    const radiusTagMarker = L.marker([tempZone.center_lat + latOffset, tempZone.center_lng], {
      icon: radiusTagIcon,
      interactive: false,
    });
    tempZoneLayerRef.current.addLayer(radiusTagMarker);
  }, [tempZone]);

  // 4. Render Decisive Helping Points (Depots with High-Visibility Badges & Icons)
  useEffect(() => {
    depotsLayerRef.current.clearLayers();
    if (!activeLayers.depots) return;

    helpingPoints.forEach((point) => {
      const color = AGENCY_COLORS[point.type] || '#2563EB';
      const marker = L.marker([point.lat, point.lng], {
        icon: getHelpingPointLeafletIcon(point),
        bubblingMouseEvents: true,
      });

      marker.bindPopup(`
        <div class="p-3 text-slate-900 font-sans">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" style="background:${color}"></span>
            <p class="font-bold text-sm text-slate-900">${point.name}</p>
          </div>
          <div class="mt-2 space-y-1 text-xs">
            <p class="text-slate-500">Agency: <span class="font-bold uppercase text-slate-800">${point.type}</span></p>
            <p class="text-slate-500">Capacity: <span class="font-bold text-slate-800">${point.capacity_score * 100}%</span></p>
            <p class="text-slate-500">Reliability: <span class="font-bold text-emerald-600">${(point.reliability_score * 100).toFixed(0)}%</span></p>
          </div>
        </div>
      `);

      marker.on('click', () => onPointClick?.(point));
      depotsLayerRef.current.addLayer(marker);
    });
  }, [helpingPoints, activeLayers.depots]);

  // 5. Render SOS Reports
  useEffect(() => {
    reportsLayerRef.current.clearLayers();
    if (!activeLayers.reports) return;

    reports.forEach((report) => {
      const icon = L.divIcon({
        className: 'custom-sos-marker',
        html: `
          <div style="position: relative; width: 26px; height: 26px;">
            <div style="
              position: absolute;
              inset: 0;
              background: #DC2626;
              border-radius: 50%;
              opacity: 0.5;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 18px;
              height: 18px;
              top: 4px;
              left: 4px;
              background: #DC2626;
              border: 2px solid #FFFFFF;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
            "></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([report.lat, report.lng], {
        icon,
        bubblingMouseEvents: true,
      });

      marker.bindPopup(`
        <div class="p-2.5 text-slate-900 font-sans max-w-xs">
          <p class="font-bold text-sm text-red-600">SOS Incident #${report.report_id}</p>
          <p class="text-xs text-slate-700 mt-1 italic">"${report.raw_text}"</p>
        </div>
      `);

      marker.on('click', () => onReportClick?.(report));
      reportsLayerRef.current.addLayer(marker);
    });
  }, [reports, activeLayers.reports]);

  // 6. Render Supply Lines (Animated Moving Dotted Vectors along Real-World Roads)
  useEffect(() => {
    supplyLinesLayerRef.current.clearLayers();
    if (!activeLayers.supplyLines || resolvedSupplyLines.length === 0) return;

    resolvedSupplyLines.forEach((line) => {
      const isEnRoute = line.status === 'en_route';
      const color = isEnRoute ? '#0284C7' : '#10B981';

      // A. Translucent Background Guide Track along actual roads
      const track = L.polyline(line.path, {
        color: color,
        weight: 3.5,
        opacity: 0.3,
        interactive: false,
      });
      supplyLinesLayerRef.current.addLayer(track);

      // B. Animated Moving Dotted Stream along actual road curves
      const flowLine = L.polyline(line.path, {
        color: color,
        weight: 4.5,
        opacity: 0.95,
        dashArray: '8, 12',
        className: isEnRoute ? 'animated-supply-line-enroute' : 'animated-supply-line-flow',
        interactive: false,
      });
      supplyLinesLayerRef.current.addLayer(flowLine);
    });
  }, [resolvedSupplyLines, activeLayers.supplyLines]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-[#f8fafc] cursor-crosshair ${className}`}
      style={{ minHeight: '100%' }}
    />
  );
};
