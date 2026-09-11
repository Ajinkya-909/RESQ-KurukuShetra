import { Zone, HelpingPoint } from '../../types';

export interface MapLayersState {
  zones: boolean;
  depots: boolean;
  reports: boolean;
  supplyLines: boolean;
}

export interface TacticalMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  zones?: Zone[];
  helpingPoints?: HelpingPoint[];
  reports?: Array<{
    report_id: number;
    lat: number;
    lng: number;
    severity_signal?: number;
    verification_status?: string;
    raw_text?: string;
    zone_name?: string | null;
  }>;
  supplyLines?: Array<{
    allocation_id: number;
    from_lat: number;
    from_lng: number;
    to_lat: number;
    to_lng: number;
    resource_name: string;
    quantity: number;
    status: string;
  }>;
  tempZone?: {
    center_lat: number;
    center_lng: number;
    radius_m: number;
    severity_level?: string;
  } | null;
  selectedZoneId?: number | null;
  selectedPointId?: number | null;
  activeLayers?: MapLayersState;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  onZoneClick?: (zone: Zone) => void;
  onPointClick?: (point: HelpingPoint) => void;
  onReportClick?: (report: any) => void;
  className?: string;
}
