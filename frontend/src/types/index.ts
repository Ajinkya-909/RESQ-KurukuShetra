// ============================================================
// RESQ — TypeScript Domain Models & Contracts
// ============================================================

// ── Scenario ─────────────────────────────────────────────────
export interface Scenario {
  scenario_id: string;
  name: string;
  description?: string | null;
  disaster_type: string;
  status: 'setup' | 'running' | 'paused' | 'completed';
  sim_time: string;
  created_at: string;
  updated_at: string;
  stats?: ScenarioStats;
}

export interface ScenarioStats {
  total_zones: number;
  critical_zones: number;
  affected_population: number;
  active_reports: number;
  total_allocations: number;
  pending_approvals: number;
}

// ── Zones & Needs ────────────────────────────────────────────
export interface ZoneNeed {
  resource_id: number;
  resource_name: string;
  unit: string;
  quantity_needed: number;
  quantity_fulfilled: number;
  fulfillment_status: 'shortage' | 'balanced' | 'surplus';
}

export interface Zone {
  zone_id: number;
  scenario_id?: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  disaster_type?: string;
  severity_score?: number;       // 0.0 to 1.0
  severity_level: 'low' | 'moderate' | 'high' | 'critical' | string;
  confidence_score?: number;     // 0.0 to 1.0
  population_estimate?: number;
  status?: 'active' | 'stabilizing' | 'resolved' | string;
  time_to_exhaustion?: {
    water_hours: number;
    food_hours: number;
    critical_resource: string;
  };
  needs?: ZoneNeed[];
  needs_summary?: {
    total_needed: number;
    shortage: number;
    balanced: number;
    surplus: number;
  };
}

// ── Helping Points (Depots / Hubs) ───────────────────────────
export interface InventoryItem {
  resource_id: number;
  resource_name: string;
  unit: string;
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  in_transit: number;
  max_capacity: number;
  replenish_rate: number;
}

export interface HelpingPoint {
  point_id: number;
  name: string;
  type: 'ngo' | 'govt' | 'private' | 'hospital' | 'military';
  lat: number;
  lng: number;
  reliability_score: number;
  arrangement_capability: number;
  status: 'active' | 'overwhelmed' | 'offline';
  inventory?: InventoryItem[];
  active_allocations?: number;
  utilization_pct?: number;
}

export interface ResourceType {
  resource_id: number;
  name: string;
  unit: string;
}

// ── Field SOS Reports ────────────────────────────────────────
export interface Report {
  report_id: number;
  scenario_id: string;
  zone_id?: number | null;
  zone_name?: string | null;
  lat: number;
  lng: number;
  raw_text: string;
  extracted_json?: {
    incident_type?: string;
    stranded_count?: number;
    medical_need?: string;
    required_resources?: Array<{ resource: string; min_qty: number }>;
  } | null;
  severity_signal: number;
  verification_status: 'unverified' | 'verified' | 'duplicate' | 'rejected';
  source: string;
  created_at: string;
}

// ── Allocations ──────────────────────────────────────────────
export type AllocationStatus =
  | 'proposed'
  | 'confirmed'
  | 'en_route'
  | 'delivered'
  | 'cancelled'
  | 'on_hold';

export interface Allocation {
  allocation_id: number;
  scenario_id: string;
  zone_id: number;
  zone_name?: string;
  report_id?: number | null;
  point_id: number;
  point_name?: string;
  point_lat?: number;
  point_lng?: number;
  resource_id: number;
  resource_name?: string;
  resource_unit?: string;
  quantity: number;
  target_lat: number;
  target_lng: number;
  status: AllocationStatus;
  hold_reason?: string | null;
  eta?: string | null;
  exhaustion_estimate?: string | null;
  created_at: string;
  updated_at: string;
}

// ── Master Dashboard Data Contract ───────────────────────────
export interface DashboardData {
  scenario: Scenario;
  kpi: {
    total_zones: number;
    critical_zones: number;
    affected_population: number;
    active_sos_reports: number;
    system_confidence?: number;
    total_allocations: number;
    pending_approvals: number;
    resources_in_transit: number;
    corridor_efficiency_pct?: number;
  };
  kpis?: {
    total_zones?: number;
    critical_zones?: number;
    affected_population?: number;
    active_sos_reports?: number;
    system_confidence?: number;
    total_allocations?: number;
    pending_approvals?: number;
    resources_in_transit?: number;
    corridor_efficiency_pct?: number;
  };
  zones: Zone[];
  helping_points: HelpingPoint[];
  active_reports: Array<{
    report_id: number;
    lat: number;
    lng: number;
    severity_signal?: number;
    verification_status?: string;
    zone_name?: string | null;
    raw_text?: string;
    created_at: string;
    pending_allocations?: Array<{
      allocation_id: number;
      point_name: string;
      resource_name: string;
      quantity: number;
    }>;
  }>;
  supply_lines: Array<{
    allocation_id: number;
    from_name?: string;
    from_lat: number;
    from_lng: number;
    to_name?: string;
    to_lat: number;
    to_lng: number;
    resource_name: string;
    quantity: number;
    status: AllocationStatus | string;
  }>;
  pending_approvals: Array<{
    allocation_id: number;
    point_name: string;
    zone_name: string;
    resource_name: string;
    quantity: number;
    report_id?: number | null;
    report_text?: string | null;
    target_lat?: number;
    target_lng?: number;
    reasoning?: string | null;
  }>;
  duplicate_flags?: Array<{
    flag_id: number;
    duplicate_score: number;
    report_1?: { report_id: number; raw_text: string } | null;
    report_2?: { report_id: number; raw_text: string } | null;
  }>;
  redundant_warnings?: Array<{
    point_id: number;
    point_name: string;
    resource_name: string;
    available_stock: number;
    message: string;
  }>;
}

// ── Audit Log ────────────────────────────────────────────────
export interface AuditLogItem {
  log_id: number;
  scenario_id: string;
  event_type: string;
  agent_name: 'VerificationAgent' | 'NeedsAgent' | 'CoordinatorAgent' | 'system' | string;
  zone_id?: number | null;
  zone_name?: string | null;
  point_id?: number | null;
  point_name?: string | null;
  allocation_id?: number | null;
  report_id?: number | null;
  reasoning_text: string;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface AuditLogResponse {
  total: number;
  limit: number;
  offset: number;
  logs: AuditLogItem[];
}

// ── API Error Schema ─────────────────────────────────────────
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// ── Response Copilot & Mission Contracts ────────────────────
export interface CopilotResourceRequirement {
  resource_name: string;
  quantity: number;
}

export interface GeminiAiBrief {
  ai_available: boolean;
  fallback_reason?: string;
  incident_summary: string;
  incident_type: string;
  urgency_explanation: string;
  response_explanation: string;
  key_factors: string[];
  model_used?: string;
}

export interface CopilotIncident {
  incident_id: string;
  scenario_id: string;
  name: string;
  sector_name: string;
  report_ids: number[];
  center_lat: number;
  center_lng: number;
  report_count: number;
  affected_people: number;
  medical_cases: number;
  severity_score: number;
  severity_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | string;
  priority_score: number;
  status: 'ACTION_REQUIRED' | 'DETECTED' | 'APPROVED' | 'DISPATCHED' | 'IN_PROGRESS' | 'RESOLVED' | string;
  allocation_ids: number[];
  recommended_depot: string;
  recommended_resources: CopilotResourceRequirement[];
  ground_truth_reasons: string[];
  ai_brief?: GeminiAiBrief;
  created_at: string;
}

export interface CopilotMission {
  mission_id: string;
  allocation_id: number;
  scenario_id: string;
  title: string;
  resource_name: string;
  quantity: number;
  unit: string;
  source_depot: string;
  destination_zone: string;
  target_lat: number;
  target_lng: number;
  status: 'APPROVED' | 'DISPATCHED' | 'EN_ROUTE' | 'DELIVERED' | string;
  raw_allocation_status: string;
  updated_at: string;
}

export interface CopilotState {
  scenario_id: string;
  all_clear: boolean;
  summary: {
    total_incidents: number;
    action_required: number;
    critical_incidents: number;
    total_affected_citizens: number;
    active_missions: number;
    monitoring_zones: number;
  };
  incidents: CopilotIncident[];
  missions: CopilotMission[];
}

