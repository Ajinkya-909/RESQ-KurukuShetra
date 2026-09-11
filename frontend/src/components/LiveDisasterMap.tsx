import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Waves,
  Truck,
  Navigation,
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Zone } from '../types';

type BasemapType = 'voyager' | 'osm' | 'dark';

export const LiveDisasterMap: React.FC = () => {
  const {
    zones,
    openZoneDetail,
    openResourceDrawer,
    resources,
    emergencySimulated,
    reallocationApproved
  } = useApp();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layer groups for toggleable data
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const floodLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const incidentsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const resourcesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const routesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const infrastructureLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Layer Visibility State
  const [showIncidents, setShowIncidents] = useState(true);
  const [showFloodZones, setShowFloodZones] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showSafeRoutes, setShowSafeRoutes] = useState(true);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [activeBasemap, setActiveBasemap] = useState<BasemapType>('voyager');
  const [selectedIncident, setSelectedIncident] = useState<{
    title: string;
    zone: string;
    details: string;
    severity: string;
    time: string;
  } | null>(null);

  // Basemap Tile URLs
  const basemapUrls: Record<BasemapType, { url: string; attribution: string }> = {
    voyager: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }
  };

  const getSeverityColor = (severity: Zone['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f97316';
      case 'ELEVATED':
        return '#eab308';
      case 'MONITOR':
        return '#10b981';
      default:
        return '#3b82f6';
    }
  };

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center coordinates around strategic coastal / river basin
    const map = L.map(mapContainerRef.current, {
      center: [29.9680, -90.0760],
      zoom: 12.4,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false
    });

    mapRef.current = map;

    // Add scale bar
    L.control.scale({ position: 'bottomright', imperial: true, metric: true }).addTo(map);

    // Initial Tile Layer
    const { url, attribution } = basemapUrls[activeBasemap];
    const tileLayer = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);
    baseTileLayerRef.current = tileLayer;

    // Add all layer groups to map
    zonesLayerRef.current.addTo(map);
    floodLayerRef.current.addTo(map);
    routesLayerRef.current.addTo(map);
    infrastructureLayerRef.current.addTo(map);
    incidentsLayerRef.current.addTo(map);
    resourcesLayerRef.current.addTo(map);

    // Resize observer to keep map centered when container shifts
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Handle Basemap Switcher
  useEffect(() => {
    if (!mapRef.current) return;
    if (baseTileLayerRef.current) {
      mapRef.current.removeLayer(baseTileLayerRef.current);
    }
    const { url, attribution } = basemapUrls[activeBasemap];
    const newTileLayer = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(mapRef.current);
    baseTileLayerRef.current = newTileLayer;
    newTileLayer.bringToBack();
  }, [activeBasemap]);

  // 3. Layer Visibility Sync
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (showIncidents) {
      if (!map.hasLayer(incidentsLayerRef.current)) map.addLayer(incidentsLayerRef.current);
    } else {
      if (map.hasLayer(incidentsLayerRef.current)) map.removeLayer(incidentsLayerRef.current);
    }

    if (showFloodZones) {
      if (!map.hasLayer(floodLayerRef.current)) map.addLayer(floodLayerRef.current);
      if (!map.hasLayer(zonesLayerRef.current)) map.addLayer(zonesLayerRef.current);
    } else {
      if (map.hasLayer(floodLayerRef.current)) map.removeLayer(floodLayerRef.current);
      if (map.hasLayer(zonesLayerRef.current)) map.removeLayer(zonesLayerRef.current);
    }

    if (showResources) {
      if (!map.hasLayer(resourcesLayerRef.current)) map.addLayer(resourcesLayerRef.current);
    } else {
      if (map.hasLayer(resourcesLayerRef.current)) map.removeLayer(resourcesLayerRef.current);
    }

    if (showSafeRoutes) {
      if (!map.hasLayer(routesLayerRef.current)) map.addLayer(routesLayerRef.current);
    } else {
      if (map.hasLayer(routesLayerRef.current)) map.removeLayer(routesLayerRef.current);
    }
  }, [showIncidents, showFloodZones, showResources, showSafeRoutes]);

  // 4. Render Map Features (Zones, Flood Overlays, Routes, Incidents, Resources)
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing dynamic layers
    zonesLayerRef.current.clearLayers();
    floodLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();
    infrastructureLayerRef.current.clearLayers();
    incidentsLayerRef.current.clearLayers();
    resourcesLayerRef.current.clearLayers();

    // A. FLOOD HAZARD INUNDATION OVERLAYS
    const floodAreas = [
      {
        name: 'Zone A Riverside Levee Overflow',
        coords: [29.9740, -90.0920] as [number, number],
        radius: 1250,
        color: '#ef4444',
        fillOpacity: 0.22,
        surge: '+1.8m crest'
      },
      {
        name: 'Zone B Lakeview Perimeter Surge',
        coords: [29.9880, -90.0620] as [number, number],
        radius: 1000,
        color: '#f97316',
        fillOpacity: 0.18,
        surge: '+1.1m surge'
      },
      {
        name: 'Zone C Greenfield / Rivermouth Flood',
        coords: [29.9480, -90.0510] as [number, number],
        radius: 1350,
        color: '#ef4444',
        fillOpacity: 0.26,
        surge: '+2.1m critical'
      },
      {
        name: 'Zone D Mapleton Lowland Drainage',
        coords: [29.9390, -90.0980] as [number, number],
        radius: emergencySimulated ? 1150 : 800,
        color: emergencySimulated ? '#ef4444' : '#10b981',
        fillOpacity: emergencySimulated ? 0.25 : 0.08,
        surge: emergencySimulated ? '+2.4m surge' : '+0.2m steady'
      },
      {
        name: 'Zone E Highland Ridge Safe Assembly',
        coords: [30.0050, -90.0780] as [number, number],
        radius: 800,
        color: '#10b981',
        fillOpacity: 0.08,
        surge: '0.0m dry'
      }
    ];

    floodAreas.forEach(area => {
      const floodCircle = L.circle(area.coords, {
        radius: area.radius,
        color: area.color,
        weight: 2,
        dashArray: '6, 6',
        fillColor: area.color,
        fillOpacity: area.fillOpacity
      });
      floodCircle.bindTooltip(
        `<div class="text-xs font-bold text-slate-900">${area.name}</div><div class="text-[11px] text-slate-600">Surge: ${area.surge}</div>`,
        { direction: 'top', opacity: 0.95 }
      );
      floodLayerRef.current.addLayer(floodCircle);
    });

    // B. SECTOR ZONES & INTERACTIVE TACTICAL LABELS
    zones.forEach(zone => {
      const lat = zone.lat ?? 29.9680;
      const lng = zone.lng ?? -90.0760;
      const isCritical = zone.severity === 'CRITICAL';
      const color = getSeverityColor(zone.severity);

      // Custom DivIcon for Zone Label
      const markerHtml = `
        <div class="group cursor-pointer relative" style="transform: translate(-50%, -50%);">
          ${isCritical ? '<span class="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping pointer-events-none"></span>' : ''}
          <div class="flex items-center gap-1.5 bg-slate-900/95 hover:bg-slate-900 text-white border ${
            isCritical ? 'border-rose-500' : 'border-slate-700'
          } px-2 py-1 rounded-xl shadow-xl backdrop-blur-md transition-transform hover:scale-105 select-none">
            <span class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white" style="background-color: ${color}">
              ${zone.priority}
            </span>
            <div class="flex flex-col text-left">
              <span class="text-[11px] font-black tracking-tight leading-none">${zone.code}</span>
              <span class="text-[9px] text-slate-300 font-medium">${zone.name}</span>
            </div>
          </div>
        </div>
      `;

      const zoneIcon = L.divIcon({
        className: 'leaflet-zone-marker',
        html: markerHtml,
        iconSize: [110, 36],
        iconAnchor: [55, 18]
      });

      const zoneMarker = L.marker([lat, lng], { icon: zoneIcon });
      zoneMarker.on('click', () => {
        openZoneDetail(zone);
      });
      zonesLayerRef.current.addLayer(zoneMarker);
    });

    // C. CRITICAL INFRASTRUCTURE (Hospital & Helping Points)
    // 1. St. Jude Memorial Hospital (Zone C Rivermouth)
    const hospitalIcon = L.divIcon({
      className: 'leaflet-hospital-marker',
      html: `
        <div class="relative cursor-pointer group" style="transform: translate(-50%, -50%);">
          <span class="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping pointer-events-none"></span>
          <div class="flex items-center gap-1.5 bg-white border-2 border-rose-500 text-slate-900 px-2.5 py-1 rounded-lg shadow-lg font-bold text-xs hover:scale-105 transition-all">
            <div class="w-4 h-4 rounded bg-rose-600 flex items-center justify-center text-white font-black text-[10px]">
              +
            </div>
            <div class="flex flex-col text-left leading-tight">
              <span class="text-[11px] font-extrabold text-rose-700">Hospital (Basement Flooded)</span>
              <span class="text-[9px] text-slate-500">40 Patients Stranded · Zone C</span>
            </div>
          </div>
        </div>
      `,
      iconSize: [180, 34],
      iconAnchor: [90, 17]
    });
    const hospitalMarker = L.marker([29.9495, -90.0485], { icon: hospitalIcon });
    hospitalMarker.on('click', () => {
      setSelectedIncident({
        title: 'Hospital Basement Flooded — 40 Patients Stranded',
        zone: 'Zone C (Greenfield / Rivermouth)',
        details: 'Power generator submerged in basement. Critical medical kits and swiftwater evacuation boat needed immediately.',
        severity: 'CRITICAL',
        time: '11:41:52'
      });
    });
    infrastructureLayerRef.current.addLayer(hospitalMarker);

    // 2. Helping Points / Logistics Depots
    const helpingPoints = [
      { name: 'Helping Point A (Depot 1)', coords: [29.9790, -90.1050] as [number, number], stock: 'Ambulances & Rations' },
      { name: 'Helping Point B (Marina Slip 4)', coords: [29.9820, -90.0550] as [number, number], stock: 'Swiftwater SAR & Boats' }
    ];

    helpingPoints.forEach(hp => {
      const hpIcon = L.divIcon({
        className: 'leaflet-hp-marker',
        html: `
          <div class="cursor-pointer group flex items-center gap-1.5 bg-blue-900/90 border border-blue-400 text-white px-2 py-0.5 rounded-lg shadow-md text-xs hover:scale-105 transition-all" style="transform: translate(-50%, -50%);">
            <div class="w-3 h-3 rounded-full bg-blue-400"></div>
            <span class="text-[10px] font-bold">${hp.name}</span>
          </div>
        `,
        iconSize: [140, 24],
        iconAnchor: [70, 12]
      });
      const marker = L.marker(hp.coords, { icon: hpIcon });
      marker.bindTooltip(
        `<div class="text-xs font-bold text-slate-900">${hp.name}</div><div class="text-[11px] text-slate-600">Stock: ${hp.stock}</div>`,
        { direction: 'top' }
      );
      infrastructureLayerRef.current.addLayer(marker);
    });

    // D. INCIDENTS (SOS Markers)
    const incidents = [
      {
        id: 'inc-hospital',
        coords: [29.9495, -90.0485] as [number, number],
        title: 'Hospital Basement Flooded',
        zone: 'Zone C',
        severity: 'CRITICAL',
        people: '40 patients stranded',
        time: '11:41:52'
      },
      {
        id: 'inc-r17',
        coords: [29.9850, -90.0680] as [number, number],
        title: 'Road R17 Blocked',
        zone: 'Zone B',
        severity: 'HIGH',
        people: 'Power pole down',
        time: '11:28:10'
      },
      {
        id: 'inc-levee',
        coords: [29.9760, -90.0960] as [number, number],
        title: 'Riverside Levee Overflow',
        zone: 'Zone A',
        severity: 'CRITICAL',
        people: '137 verified calls',
        time: '11:41:15'
      },
      {
        id: 'inc-marsh',
        coords: [29.9620, -90.0750] as [number, number],
        title: 'Stranded Civilian Boat',
        zone: 'Marsh Basin',
        severity: 'HIGH',
        people: '4 civilians',
        time: '10:32:00'
      }
    ];

    if (emergencySimulated) {
      incidents.push({
        id: 'inc-school-gym',
        coords: [29.9390, -90.0980] as [number, number],
        title: 'Mapleton School Shelter Inundation',
        zone: 'Zone D',
        severity: 'CRITICAL',
        people: '30 trapped, 8 injured',
        time: '11:43:02'
      });
    }

    incidents.forEach(inc => {
      const isCrit = inc.severity === 'CRITICAL';
      const sosIcon = L.divIcon({
        className: 'leaflet-sos-marker',
        html: `
          <div class="relative cursor-pointer group" style="transform: translate(-50%, -50%);">
            <span class="absolute -inset-2 rounded-full ${isCrit ? 'bg-rose-500/50' : 'bg-amber-500/40'} animate-ping pointer-events-none"></span>
            <div class="w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] text-white shadow-lg border-2 border-white ${
              isCrit ? 'bg-rose-600' : 'bg-amber-500'
            } hover:scale-110 transition-transform">
              SOS
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const sosMarker = L.marker(inc.coords, { icon: sosIcon });
      sosMarker.on('click', () => {
        setSelectedIncident({
          title: inc.title,
          zone: inc.zone,
          details: `${inc.people} · Reported at ${inc.time}`,
          severity: inc.severity,
          time: inc.time
        });
      });
      incidentsLayerRef.current.addLayer(sosMarker);
    });

    // E. BLOCKED ROADS & SAFE ROUTES (Polylines)
    // 1. Blocked Road R17 (Red dashed line + Cross marker)
    const r17Points: [number, number][] = [
      [29.9870, -90.0740],
      [29.9850, -90.0680],
      [29.9830, -90.0620]
    ];
    const r17Line = L.polyline(r17Points, {
      color: '#ef4444',
      weight: 5,
      dashArray: '8, 8',
      opacity: 0.9
    });
    r17Line.bindTooltip('<b>ROAD R17 (BLOCKED)</b><br/>Utility line collapse', { sticky: true });
    routesLayerRef.current.addLayer(r17Line);

    const blockedBadgeIcon = L.divIcon({
      className: 'leaflet-blocked-badge',
      html: `
        <div class="bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white/80" style="transform: translate(-50%, -50%);">
          <span>✕</span>
          <span>R17 BLOCKED</span>
        </div>
      `,
      iconSize: [90, 20],
      iconAnchor: [45, 10]
    });
    routesLayerRef.current.addLayer(L.marker([29.9850, -90.0680], { icon: blockedBadgeIcon }));

    // 2. Safe Evacuation Route (Green Glowing Line)
    const evacGreen1: [number, number][] = [
      [29.9450, -90.0550],
      [29.9600, -90.0700],
      [29.9720, -90.0820],
      [29.9920, -90.0840],
      [30.0050, -90.0780]
    ];
    const evacLine = L.polyline(evacGreen1, {
      color: '#10b981',
      weight: 6,
      opacity: 0.85,
      dashArray: '10, 6'
    });
    evacLine.bindTooltip('<b>EVAC ROUTE GREEN-1 (OPEN)</b><br/>High-capacity evacuation route to Highland Ridge', { sticky: true });
    routesLayerRef.current.addLayer(evacLine);

    // Alternate Route R12
    const r12Points: [number, number][] = [
      [29.9710, -90.1050],
      [29.9740, -90.0920],
      [29.9790, -90.0800]
    ];
    const r12Line = L.polyline(r12Points, {
      color: '#3b82f6',
      weight: 4,
      dashArray: '4, 6',
      opacity: 0.8
    });
    r12Line.bindTooltip('<b>ROUTE R12 (PASSABLE)</b><br/>Alternate corridor into Riverside', { sticky: true });
    routesLayerRef.current.addLayer(r12Line);

    // Dynamic Reallocation Route to Zone D when approved!
    if (reallocationApproved) {
      const reallocRoute: [number, number][] = [
        [29.9820, -90.0550], // Marina Slip 4
        [29.9650, -90.0800],
        [29.9390, -90.0980]  // Zone D Mapleton
      ];
      const reallocLine = L.polyline(reallocRoute, {
        color: '#8b5cf6',
        weight: 5,
        dashArray: '8, 8',
        opacity: 0.95
      });
      reallocLine.bindTooltip('<b>MISSION #R-042 DISPATCH CORRIDOR</b><br/>Rescue Boat B2 & Medical Team M2 redirect to Zone D', { sticky: true });
      routesLayerRef.current.addLayer(reallocLine);
    }

    // F. REAL-TIME DEPLOYED RESOURCES (Ambulance, Boat, Medical Team, Food, Water)
    const deployedUnits = [
      {
        name: 'Ambulance A7',
        type: 'Ambulance',
        coords: [29.9680, -90.0880] as [number, number],
        dest: 'Zone A (Riverside)',
        iconBg: 'bg-rose-500',
        resourceId: 'res-ambulances'
      },
      {
        name: 'Rescue Boat B2',
        type: 'Rescue Boat',
        coords: reallocationApproved
          ? ([29.9550, -90.0850] as [number, number])
          : ([29.9810, -90.0580] as [number, number]),
        dest: reallocationApproved ? 'Zone D (Mapleton Flooding)' : 'Zone B (Lakeview)',
        iconBg: 'bg-cyan-600',
        resourceId: 'res-boats'
      },
      {
        name: 'Medical Team M1',
        type: 'Medical Team',
        coords: [29.9800, -90.0720] as [number, number],
        dest: 'Zone B (Lakeview)',
        iconBg: 'bg-emerald-600',
        resourceId: 'res-med-teams'
      },
      {
        name: 'Water Tanker W1',
        type: 'Water Supply',
        coords: [29.9550, -90.0600] as [number, number],
        dest: 'Zone C (Greenfield)',
        iconBg: 'bg-blue-600',
        resourceId: 'res-water'
      }
    ];

    deployedUnits.forEach(unit => {
      const resIcon = L.divIcon({
        className: 'leaflet-unit-marker',
        html: `
          <div class="cursor-pointer group flex items-center gap-1.5 bg-slate-900/90 text-white border border-slate-700 px-2 py-1 rounded-lg shadow-lg hover:scale-105 transition-all text-xs" style="transform: translate(-50%, -50%);">
            <div class="w-2.5 h-2.5 rounded-full ${unit.iconBg} animate-pulse"></div>
            <span class="font-bold text-[10px] whitespace-nowrap">${unit.name}</span>
          </div>
        `,
        iconSize: [120, 26],
        iconAnchor: [60, 13]
      });

      const resMarker = L.marker(unit.coords, { icon: resIcon });
      resMarker.on('click', () => {
        const found = resources.find(r => r.id === unit.resourceId);
        if (found) openResourceDrawer(found);
      });
      resMarker.bindTooltip(
        `<div class="text-xs font-bold text-slate-900">${unit.name} (${unit.type})</div><div class="text-[11px] text-slate-600">Heading: ${unit.dest}</div><div class="text-[10px] text-blue-600 font-semibold mt-0.5">Click to inspect fleet</div>`,
        { direction: 'top' }
      );
      resourcesLayerRef.current.addLayer(resMarker);
    });
  }, [zones, emergencySimulated, reallocationApproved, resources]);

  // Zoom helpers
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleResetBounds = () => {
    if (!mapRef.current) return;
    mapRef.current.setView([29.9680, -90.0760], 12.4, { animate: true });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-[560px] sm:h-[620px] overflow-hidden">
      {/* Map Card Header with Layer Controls & Basemap Switcher */}
      <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Live Disaster Map
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Leaflet GIS · OSM / Carto
          </span>
        </div>

        {/* 4 Layer Toggle Buttons + Basemap Selection */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowIncidents(!showIncidents)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              showIncidents
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>Incidents</span>
          </button>

          <button
            onClick={() => setShowFloodZones(!showFloodZones)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              showFloodZones
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Waves className="w-3 h-3 text-blue-500" />
            <span>Flood Zones</span>
          </button>

          <button
            onClick={() => setShowResources(!showResources)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              showResources
                ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck className="w-3 h-3 text-purple-500" />
            <span>Resources</span>
          </button>

          <button
            onClick={() => setShowSafeRoutes(!showSafeRoutes)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              showSafeRoutes
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Navigation className="w-3 h-3 text-emerald-500" />
            <span>Safe Routes</span>
          </button>

          {/* Basemap Toggle Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={activeBasemap}
              onChange={(e) => setActiveBasemap(e.target.value as BasemapType)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Change Map Tile Style"
            >
              <option value="voyager">Carto Voyager</option>
              <option value="osm">OSM Standard</option>
              <option value="dark">Tactical Dark</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Canvas Stage */}
      <div className="relative flex-1 bg-slate-100 overflow-hidden select-none">
        {/* Leaflet Mount Container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Legend Box (Top Left) - Matching Reference Image */}
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl text-[11px] text-slate-200 shadow-xl overflow-hidden max-w-[190px]">
          <div
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            className="flex items-center justify-between px-3 py-2 bg-slate-800/80 cursor-pointer font-bold text-slate-100 select-none hover:bg-slate-800"
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Map Legend</span>
            </span>
            {isLegendOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>

          {isLegendOpen && (
            <div className="p-2.5 space-y-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 border border-white flex items-center justify-center text-[7px] text-white font-bold">
                  !
                </span>
                <span>Incident (SOS)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-rose-600 text-white font-black text-[9px] flex items-center justify-center">
                  +
                </span>
                <span>Hospital</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Helping Point (Hub)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Active Mission / Resource</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-rose-500 border-b border-dashed border-white" />
                <span>Blocked Road (R17)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-emerald-500" />
                <span>Accessible Route</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-dashed border-amber-400 bg-amber-400/20" />
                <span>Zone Boundary</span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Incident Drawer / Popover on Map (if clicked) */}
        {selectedIncident && (
          <div className="absolute top-3 right-3 z-10 bg-slate-900/95 backdrop-blur-md border border-rose-500/80 rounded-xl p-3.5 text-slate-100 shadow-2xl max-w-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  {selectedIncident.severity} INCIDENT
                </span>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <h4 className="text-xs font-bold text-white mt-1 leading-snug">
              {selectedIncident.title}
            </h4>
            <div className="text-[11px] text-slate-300 mt-1">
              {selectedIncident.details}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-800">
              <span>Reported: {selectedIncident.time}</span>
              <button
                onClick={() => {
                  openZoneDetail(selectedIncident.zone);
                  setSelectedIncident(null);
                }}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>View Sector</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Map Statistics Pill (Matching reference spec) */}
        <div className="absolute bottom-3 left-3 z-10 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-200 shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>17 Incidents</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>24 Active Routes</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>12 Resources Deployed</span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>5 Blocked Roads</span>
          </div>
        </div>

        {/* Zoom & Recenter Controls (Bottom Right) */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700 p-1 rounded-xl shadow-lg">
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetBounds}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Recenter Map"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
