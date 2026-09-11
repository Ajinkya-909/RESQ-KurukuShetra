import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { TacticalMapProps } from './types';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  GOOGLE_MAPS_LIGHT_STYLE,
  getSeverityColor,
  AGENCY_COLORS,
} from './mapStyles';

import { fetchRoadRoute, LatLng } from './routeService';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

interface ResolvedSupplyLine {
  allocation_id: number;
  status: string;
  path: LatLng[];
}

export const GoogleMapEngine: React.FC<TacticalMapProps> = ({
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
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeInfoWindow, setActiveInfoWindow] = useState<{
    type: 'zone' | 'depot' | 'report';
    data: any;
    position: { lat: number; lng: number };
  } | null>(null);

  // Direct overlay refs to prevent @react-google-maps/api circle leakage & overlaps
  const tempCircleRef = useRef<any>(null);
  const tempMarkerRef = useRef<any>(null);
  const savedZonesRef = useRef<Map<string, any>>(new Map());

  // Resolved Real-World Road Routes
  const [resolvedRoutes, setResolvedRoutes] = useState<ResolvedSupplyLine[]>([]);

  useEffect(() => {
    if (!activeLayers.supplyLines || supplyLines.length === 0) {
      setResolvedRoutes([]);
      return;
    }

    let isMounted = true;

    // Collect all active hazard locations (disaster zones and SOS reports)
    const activeHazards = [
      ...zones.map((z) => ({ lat: z.center_lat, lng: z.center_lng })),
      ...reports.map((r) => ({ lat: r.lat, lng: r.lng })),
    ];

    const resolveAll = async () => {
      const routes = await Promise.all(
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
            path: waypoints,
          };
        })
      );

      if (isMounted) {
        setResolvedRoutes(routes);
      }
    };

    resolveAll();
    return () => {
      isMounted = false;
    };
  }, [supplyLines, activeLayers.supplyLines, zones, reports]);

  // Animation Loop for Moving Dotted Supply Lines
  const [lineAnimOffset, setLineAnimOffset] = useState(0);

  useEffect(() => {
    if (!activeLayers.supplyLines || supplyLines.length === 0) return;

    let animId: number;
    let lastStamp = performance.now();

    const loop = (now: number) => {
      if (now - lastStamp > 500) {
        setLineAnimOffset((prev) => (prev + 1) % 20);
        lastStamp = now;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeLayers.supplyLines, supplyLines.length]);

  const onLoad = useCallback((map: any) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    // Clear all overlays when map unmounts
    if (tempCircleRef.current) {
      tempCircleRef.current.setMap(null);
      tempCircleRef.current = null;
    }
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
    savedZonesRef.current.forEach((c) => c.setMap(null));
    savedZonesRef.current.clear();
    mapRef.current = null;
    setMapReady(false);
  }, []);

  const handleMapClick = (e: any) => {
    if (e.latLng) {
      const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setActiveInfoWindow(null);
      onMapClick?.(coords);
    }
  };

  // 1. MANAGE REAL-TIME TEMP ZONE PREVIEW (Strict Single Instance, No Overlapping!)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !(window as any).google?.maps) return;
    const gmaps = (window as any).google.maps;

    // If tempZone was cleared (e.g. zone saved, cancelled, or deleted), ERASE from map immediately!
    if (!tempZone) {
      if (tempCircleRef.current) {
        tempCircleRef.current.setMap(null);
        tempCircleRef.current = null;
      }
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setMap(null);
        tempMarkerRef.current = null;
      }
      return;
    }

    const colors = getSeverityColor(tempZone.severity_level);
    const centerLatLng = new gmaps.LatLng(tempZone.center_lat, tempZone.center_lng);

    // A. Single Circle: update in-place if already exists (avoids stacking duplicate circles!)
    if (tempCircleRef.current) {
      tempCircleRef.current.setCenter(centerLatLng);
      tempCircleRef.current.setRadius(tempZone.radius_m);
      tempCircleRef.current.setOptions({
        strokeColor: colors.stroke,
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: colors.stroke,
        fillOpacity: 0.22,
      });
    } else {
      tempCircleRef.current = new gmaps.Circle({
        map: mapRef.current,
        center: centerLatLng,
        radius: tempZone.radius_m,
        strokeColor: colors.stroke,
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: colors.stroke,
        fillOpacity: 0.22,
        clickable: false,
      });
    }

    // B. Single Pin Marker: update position or create
    const markerIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="44" height="56" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2C10.95 2 2 10.95 2 22C2 34.6 20.2 53.6 21.2 54.6C21.6 55.1 22.4 55.1 22.8 54.6C23.8 53.6 42 34.6 42 22C42 10.95 33.05 2 22 2Z" fill="${colors.stroke}"/>
          <circle cx="22" cy="21" r="8" fill="#FFFFFF"/>
        </svg>
      `)}`,
      scaledSize: new gmaps.Size(38, 48),
      anchor: new gmaps.Point(19, 48),
    };

    if (tempMarkerRef.current) {
      tempMarkerRef.current.setPosition(centerLatLng);
      tempMarkerRef.current.setIcon(markerIcon);
    } else {
      tempMarkerRef.current = new gmaps.Marker({
        map: mapRef.current,
        position: centerLatLng,
        clickable: false,
        icon: markerIcon,
      });
    }
  }, [tempZone, mapReady]);



  // 2. MANAGE SAVED ZONES (Synchronously Remove Circles on Deletion)
  useEffect(() => {
    if (!mapRef.current || !mapReady || !(window as any).google?.maps) return;
    const gmaps = (window as any).google.maps;

    const currentZoneIds = new Set(zones.map((z) => String(z.zone_id)));

    // Immediately remove circles for any deleted zones!
    savedZonesRef.current.forEach((circle, id) => {
      if (!currentZoneIds.has(id) || !activeLayers.zones) {
        circle.setMap(null); // Instantly erases from Google Map canvas!
        savedZonesRef.current.delete(id);
      }
    });

    if (!activeLayers.zones) return;

    // Add or update circles for current zones
    zones.forEach((zone) => {
      const id = String(zone.zone_id);
      const colors = getSeverityColor(zone.severity_level);
      const centerLatLng = new gmaps.LatLng(zone.center_lat, zone.center_lng);
      const existingCircle = savedZonesRef.current.get(id);

      if (existingCircle) {
        existingCircle.setCenter(centerLatLng);
        existingCircle.setRadius(zone.radius_m);
        existingCircle.setOptions({
          strokeColor: colors.stroke,
          fillColor: colors.stroke,
        });
      } else {
        const newCircle = new gmaps.Circle({
          map: mapRef.current,
          center: centerLatLng,
          radius: zone.radius_m,
          strokeColor: colors.stroke,
          strokeOpacity: 0.9,
          strokeWeight: 2.5,
          fillColor: colors.stroke,
          fillOpacity: 0.22,
          clickable: true,
        });

        newCircle.addListener('click', () => {
          setActiveInfoWindow({
            type: 'zone',
            data: zone,
            position: { lat: zone.center_lat, lng: zone.center_lng },
          });
          onZoneClick?.(zone);
        });

        savedZonesRef.current.set(id, newCircle);
      }
    });
  }, [zones, activeLayers.zones, mapReady]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          styles: GOOGLE_MAPS_LIGHT_STYLE,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          backgroundColor: '#f8fafc',
        }}
      >

        {/* 3. Helping Points (Depots) - Decisive Hub Marker (Priority zIndex 100) */}
        {activeLayers.depots &&
          helpingPoints.map((point) => {
            const agencyColor = AGENCY_COLORS[point.type] || '#2563EB';
            const sizeObj = (window as any).google?.maps?.Size
              ? new (window as any).google.maps.Size(34, 43)
              : undefined;
            const anchorObj = (window as any).google?.maps?.Point
              ? new (window as any).google.maps.Point(17, 43)
              : undefined;

            return (
              <Marker
                key={`point-${point.point_id}`}
                position={{ lat: point.lat, lng: point.lng }}
                zIndex={100}
                onClick={() => {
                  setActiveInfoWindow({
                    type: 'depot',
                    data: point,
                    position: { lat: point.lat, lng: point.lng },
                  });
                  onPointClick?.(point);
                }}
                icon={{
                  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                    <svg width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 2C9.6 2 2 9.6 2 19C2 29.8 17.5 45.8 18.3 46.7C18.7 47.1 19.3 47.1 19.7 46.7C20.5 45.8 36 29.8 36 19C36 9.6 28.4 2 19 2Z" fill="${agencyColor}"/>
                      <circle cx="19" cy="18" r="9.5" fill="#FFFFFF"/>
                      <text x="19" y="22" font-size="10" font-weight="900" fill="${agencyColor}" text-anchor="middle" font-family="sans-serif">HUB</text>
                    </svg>
                  `)}`,
                  scaledSize: sizeObj,
                  anchor: anchorObj,
                }}
                title={`[DEPOT HUB] ${point.name}`}
              />
            );
          })}

        {/* 4. SOS Field Reports (Priority zIndex 150) */}
        {activeLayers.reports &&
          reports.map((report) => (
            <Marker
              key={`report-${report.report_id}`}
              position={{ lat: report.lat, lng: report.lng }}
              zIndex={150}
              onClick={() => {
                setActiveInfoWindow({
                  type: 'report',
                  data: report,
                  position: { lat: report.lat, lng: report.lng },
                });
                onReportClick?.(report);
              }}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 2C8.3 2 2 8.3 2 16C2 25 15 40 16 41C17 40 30 25 30 16C30 8.3 23.7 2 16 2Z" fill="#DC2626"/>
                    <circle cx="16" cy="15" r="7" fill="#FFFFFF"/>
                    <text x="16" y="19" font-size="9" font-weight="900" fill="#DC2626" text-anchor="middle" font-family="sans-serif">SOS</text>
                  </svg>
                `)}`,
                scaledSize: (window as any).google?.maps?.Size
                  ? new (window as any).google.maps.Size(30, 39)
                  : undefined,
                anchor: (window as any).google?.maps?.Point
                  ? new (window as any).google.maps.Point(15, 39)
                  : undefined,
              }}
              title={`SOS Incident #${report.report_id}`}
            />
          ))}

        {/* 5. Supply Lines (Animated Moving Dotted Road Vectors from Depot Source to Zone) */}
        {activeLayers.supplyLines &&
          resolvedRoutes.map((line, idx) => {
            const isEnRoute = line.status === 'en_route';
            const color = isEnRoute ? '#0284C7' : '#10B981';

            return (
              <React.Fragment key={`supply-road-${line.allocation_id || idx}`}>
                {/* Background Translucent Road Track */}
                <Polyline
                  path={line.path}
                  options={{
                    strokeColor: color,
                    strokeOpacity: 0.3,
                    strokeWeight: 3.5,
                    geodesic: true,
                  }}
                />

                {/* Animated Moving Dotted Stream along Real-World Road */}
                <Polyline
                  path={line.path}
                  options={{
                    strokeOpacity: 0,
                    geodesic: true,
                    icons: [
                      {
                        icon: {
                          path: 'M 0,-1 0,1',
                          strokeOpacity: 1,
                          strokeColor: color,
                          strokeWeight: 4,
                          scale: 3,
                        },
                        offset: `${lineAnimOffset * 1}px`,
                        repeat: '18px',
                      },
                    ],
                  }}
                />
              </React.Fragment>
            );
          })}

        {/* Info Window */}
        {activeInfoWindow && (
          <InfoWindow
            position={activeInfoWindow.position}
            onCloseClick={() => setActiveInfoWindow(null)}
          >
            <div className="text-slate-900 text-xs p-1 max-w-xs font-sans">
              {activeInfoWindow.type === 'zone' && (
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{activeInfoWindow.data.name}</h4>
                  <p className="text-slate-600 mt-0.5">
                    Severity: <span className="font-bold uppercase">{activeInfoWindow.data.severity_level}</span>
                  </p>
                  <p className="text-slate-600">Pop: {activeInfoWindow.data.population_estimate?.toLocaleString() || 'N/A'}</p>
                </div>
              )}
              {activeInfoWindow.type === 'depot' && (
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{activeInfoWindow.data.name}</h4>
                  <p className="text-slate-600 uppercase text-[10px] font-bold mt-0.5">{activeInfoWindow.data.type} Hub</p>
                  <p className="text-slate-600">Reliability: {(activeInfoWindow.data.reliability_score * 100).toFixed(0)}%</p>
                </div>
              )}
              {activeInfoWindow.type === 'report' && (
                <div>
                  <h4 className="font-bold text-sm text-red-600">SOS Incident #{activeInfoWindow.data.report_id}</h4>
                  <p className="text-slate-700 mt-1 italic line-clamp-3">"{activeInfoWindow.data.raw_text}"</p>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};
