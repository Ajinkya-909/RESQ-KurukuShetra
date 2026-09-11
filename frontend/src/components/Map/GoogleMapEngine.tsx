import React, { useCallback, useRef, useState } from 'react';
import { GoogleMap, Circle, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { TacticalMapProps } from './types';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  GOOGLE_MAPS_LIGHT_STYLE,
  getSeverityColor,
  AGENCY_COLORS,
} from './mapStyles';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

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
  const [activeInfoWindow, setActiveInfoWindow] = useState<{
    type: 'zone' | 'depot' | 'report';
    data: any;
    position: { lat: number; lng: number };
  } | null>(null);

  const onLoad = useCallback((map: any) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleMapClick = (e: any) => {
    if (e.latLng) {
      const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setActiveInfoWindow(null);
      onMapClick?.(coords);
    }
  };

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
        {/* 1. Disaster Zones Circles */}
        {activeLayers.zones &&
          zones.map((zone) => {
            const colors = getSeverityColor(zone.severity_level);
            return (
              <Circle
                key={`zone-${zone.zone_id}`}
                center={{ lat: zone.center_lat, lng: zone.center_lng }}
                radius={zone.radius_m}
                onClick={() => {
                  setActiveInfoWindow({
                    type: 'zone',
                    data: zone,
                    position: { lat: zone.center_lat, lng: zone.center_lng },
                  });
                  onZoneClick?.(zone);
                }}
                options={{
                  strokeColor: colors.stroke,
                  strokeOpacity: 0.9,
                  strokeWeight: 2.5,
                  fillColor: colors.stroke,
                  fillOpacity: 0.22,
                  clickable: true,
                }}
              />
            );
          })}

        {/* 2. Temporary Zone Preview (Creation Mode) - clickable: false */}
        {tempZone && (
          <Circle
            center={{ lat: tempZone.center_lat, lng: tempZone.center_lng }}
            radius={tempZone.radius_m}
            options={{
              strokeColor: getSeverityColor(tempZone.severity_level).stroke,
              strokeOpacity: 0.9,
              strokeWeight: 2.5,
              fillColor: getSeverityColor(tempZone.severity_level).stroke,
              fillOpacity: 0.25,
              clickable: false, // Prevents blocking map click
            }}
          />
        )}

        {/* 3. Helping Points (Depots) */}
        {activeLayers.depots &&
          helpingPoints.map((point) => {
            const agencyColor = AGENCY_COLORS[point.type] || '#2563EB';
            return (
              <Marker
                key={`point-${point.point_id}`}
                position={{ lat: point.lat, lng: point.lng }}
                onClick={() => {
                  setActiveInfoWindow({
                    type: 'depot',
                    data: point,
                    position: { lat: point.lat, lng: point.lng },
                  });
                  onPointClick?.(point);
                }}
                icon={{
                  path: (window as any).google?.maps?.SymbolPath?.CIRCLE ?? 0,
                  scale: 8,
                  fillColor: agencyColor,
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                }}
                title={point.name}
              />
            );
          })}

        {/* 4. SOS Field Reports */}
        {activeLayers.reports &&
          reports.map((report) => (
            <Marker
              key={`report-${report.report_id}`}
              position={{ lat: report.lat, lng: report.lng }}
              onClick={() => {
                setActiveInfoWindow({
                  type: 'report',
                  data: report,
                  position: { lat: report.lat, lng: report.lng },
                });
                onReportClick?.(report);
              }}
              icon={{
                path: (window as any).google?.maps?.SymbolPath?.BACKWARD_CLOSED_ARROW ?? 1,
                scale: 6,
                fillColor: '#DC2626',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 1.5,
              }}
              title={`SOS #${report.report_id}`}
            />
          ))}

        {/* 5. Supply Lines (Vectors) */}
        {activeLayers.supplyLines &&
          supplyLines.map((line, idx) => (
            <Polyline
              key={`line-${line.allocation_id || idx}`}
              path={[
                { lat: line.from_lat, lng: line.from_lng },
                { lat: line.to_lat, lng: line.to_lng },
              ]}
              options={{
                strokeColor: line.status === 'en_route' ? '#0284C7' : '#059669',
                strokeOpacity: 0.85,
                strokeWeight: 3,
                geodesic: true,
              }}
            />
          ))}

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
