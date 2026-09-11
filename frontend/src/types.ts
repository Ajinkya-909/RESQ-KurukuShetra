export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MONITOR';

export type ResourceCategory =
  | 'Ambulance'
  | 'Rescue Boat'
  | 'Medical Team'
  | 'Shelter'
  | 'Water Supply'
  | 'Food Supply';

export interface NeedBreakdownItem {
  label: string;
  percentage: number;
}

export interface Zone {
  id: string;
  code: string; // "Zone A"
  name: string; // "Riverside"
  severity: SeverityLevel;
  priority: number; // 0 - 100
  peopleAffected: number;
  mainNeed: string;
  summary: string;
  waterLevel: string;
  accessStatus: string;
  evacuatedCount: number;
  shelterCapacityUsed: number;
  breakdown: NeedBreakdownItem[];
  mapCoords: { x: number; y: number }; // percentage on map
  lat?: number;
  lng?: number;
}

export interface UnitDetail {
  id: string;
  name: string;
  agency: string;
  currentLocation: string;
  destination: string;
  mission: string;
  eta: string;
  status: 'Available' | 'Reserved' | 'Committed' | 'In Transit';
  lastUpdated: string;
}

export interface ResourceItem {
  id: string;
  type: ResourceCategory;
  displayName: string;
  currentInUse: number;
  total: number;
  percentage: number;
  availableLabel: string;
  deployedLabel: string;
  unitLabel?: string;
  subLocation?: string;
  breakdown: {
    total: number;
    available: number;
    reserved: number;
    committed: number;
    inTransit: number;
  };
  units: UnitDetail[];
}

export interface AllocationPlanItem {
  id: string;
  resource: string;
  resourceType: ResourceCategory;
  from: string;
  to: string;
  purpose: string;
  eta: string;
  status: 'En Route' | 'Dispatched' | 'Scheduled' | 'On Scene';
  priority: 'Critical' | 'High' | 'Elevated' | 'Monitor';
}

export interface LiveUpdate {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  badgeType: 'Critical' | 'High' | 'Info' | 'Success';
  zone?: string;
  read?: boolean;
}

export interface AuditEvent {
  id: string;
  decisionNumber: string; // e.g. "DECISION #1042"
  timestamp: string;
  title: string;
  description: string;
  actor: string;
  type: 'Incident' | 'Allocation' | 'Reallocation' | 'Approval' | 'Conflict';
  zoneId?: string;
  hash?: string;
}

export interface KpiData {
  activeIncidents: number;
  criticalZones: number;
  peopleAffected: number;
  resourcesDeployedPercent: number;
  resourcesDeployedFraction: string;
}

export interface ConflictData {
  agencyA: { name: string; amount: number; supply: string; destination: string };
  agencyB: { name: string; amount: number; supply: string; destination: string };
  zoneDemand: number;
  committedTotal: number;
  potentialExcess: number;
  confidence: number;
  suggestedRedirects: { amount: number; zone: string; zoneName: string }[];
}

export interface ReallocationProposal {
  planVersionOld: string;
  planVersionNew: string;
  allocationsChanged: number;
  resourcesMoved: number;
  criticalCoverageOld: number;
  criticalCoverageNew: number;
  before: { resource: string; destination: string }[];
  after: { resource: string; destination: string }[];
  rationale: {
    priorityChange: string;
    evidence: string[];
    protection: string;
  };
}
