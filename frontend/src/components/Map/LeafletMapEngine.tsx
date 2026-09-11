import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { TacticalMapProps } from './types';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  VOYAGER_LIGHT_TILES,
  getSeverityColor,
  AGENCY_COLORS,
} from './mapStyles';

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

    // Attach layer groups
    zonesLayerRef.current.addTo(map);
    depotsLayerRef.current.addTo(map);
    reportsLayerRef.current.addTo(map);
    supplyLinesLayerRef.current.addTo(map);
    tempZoneLayerRef.current.addTo(map);

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
    });
  }, [zones, activeLayers.zones]);

  // 3. Render Temp Zone Preview (CRITICAL: interactive: false so clicks pass right through!)
  useEffect(() => {
    tempZoneLayerRef.current.clearLayers();
    if (!tempZone) return;

    const colors = getSeverityColor(tempZone.severity_level);

    // A. Preview Circle (interactive: false prevents blocking subsequent map clicks)
    const circle = L.circle([tempZone.center_lat, tempZone.center_lng], {
      radius: tempZone.radius_m,
      color: colors.stroke,
      weight: 2.5,
      dashArray: '6, 6',
      fillColor: colors.stroke,
      fillOpacity: 0.28,
      interactive: false, // Prevents intercepting mouse clicks
    });
    tempZoneLayerRef.current.addLayer(circle);

    // B. Prominent Center Pin Marker
    const pinIcon = L.divIcon({
      className: 'temp-zone-center-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px;">
          <div style="
            position: absolute;
            inset: -4px;
            background: ${colors.stroke};
            border-radius: 50%;
            opacity: 0.35;
            animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            position: relative;
            width: 28px;
            height: 28px;
            background: ${colors.stroke};
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: bold;
          ">
            📍
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const centerMarker = L.marker([tempZone.center_lat, tempZone.center_lng], {
      icon: pinIcon,
      interactive: false,
    });
    tempZoneLayerRef.current.addLayer(centerMarker);
  }, [tempZone]);

  // 4. Render Helping Points (Depots)
  useEffect(() => {
    depotsLayerRef.current.clearLayers();
    if (!activeLayers.depots) return;

    helpingPoints.forEach((point) => {
      const color = AGENCY_COLORS[point.type] || '#2563EB';
      const icon = L.divIcon({
        className: 'custom-depot-marker',
        html: `
          <div style="
            width: 26px;
            height: 26px;
            background: ${color};
            border: 2.5px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
          ">
            🏢
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([point.lat, point.lng], {
        icon,
        bubblingMouseEvents: true,
      });

      marker.bindPopup(`
        <div class="p-2.5 text-slate-900 font-sans">
          <p class="font-bold text-sm text-slate-900">${point.name}</p>
          <p class="text-xs uppercase font-bold mt-1" style="color:${color}">${point.type} Hub</p>
          <p class="text-xs text-slate-600 mt-0.5">Reliability: ${(point.reliability_score * 100).toFixed(0)}%</p>
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

  // 6. Render Supply Lines
  useEffect(() => {
    supplyLinesLayerRef.current.clearLayers();
    if (!activeLayers.supplyLines) return;

    supplyLines.forEach((line) => {
      const isEnRoute = line.status === 'en_route';
      const polyline = L.polyline(
        [
          [line.from_lat, line.from_lng],
          [line.to_lat, line.to_lng],
        ],
        {
          color: isEnRoute ? '#0284C7' : '#059669',
          weight: 3.5,
          dashArray: isEnRoute ? '6, 8' : undefined,
          opacity: 0.85,
          interactive: false,
        }
      );
      supplyLinesLayerRef.current.addLayer(polyline);
    });
  }, [supplyLines, activeLayers.supplyLines]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-[#f8fafc] cursor-crosshair ${className}`}
      style={{ minHeight: '100%' }}
    />
  );
};
