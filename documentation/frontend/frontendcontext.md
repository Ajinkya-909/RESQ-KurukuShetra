# RESQ — Emergency Disaster Relief Command Center
## Frontend Architecture, API Contract & Complete Implementation Blueprint

> **Notice to AI / Developers:** This document is the **definitive, self-contained single source of truth** for building the RESQ Frontend. If you are an AI reading this, you have all the specifications, data contracts, API payloads, WebSocket events, map implementations (Google Maps + Leaflet fallback), and design requirements needed to generate the complete, fully functional website from scratch.

---

## 1. Executive Overview & System Purpose

**RESQ** is a multi-agent emergency disaster relief and resource coordinator built for State Emergency Operations Centers (EOC) and Incident Commanders.

During extreme disaster events (floods, cyclones, earthquakes), field reports arrive asynchronously with incomplete, high-urgency information. RESQ coordinates aid across responding agencies (NDRF, Red Cross, Hospitals, Military, Volunteers) by:
1. **Ingesting SOS field reports** via NLP and geospatial mapping.
2. **Prioritizing zones** by severity score (`critical`, `high`, `moderate`, `low`).
3. **Optimizing supply routing** from static Helping Points (depots) to affected zones.
4. **Enforcing human-in-the-loop oversight**: AI Coordinator proposes allocations, and Incident Commanders one-click **Approve**, **Reject**, **Dispatch**, and **Deliver**.
5. **Advancing simulation time**: A time-tick engine progresses hours, auto-replenishes depot inventories, and auto-delivers shipments upon ETA arrival.

---

## 2. Technical Stack & Dependencies

The frontend is a modern **Vite + React (TypeScript)** application styled with **Tailwind CSS**.

### Recommended `package.json`
```json
{
  "name": "resq-frontend",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview --port 3000"
  },
  "dependencies": {
    "@react-google-maps/api": "^2.20.5",
    "@types/leaflet": "^1.9.16",
    "axios": "^1.7.9",
    "clsx": "^2.1.1",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.475.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "socket.io-client": "^4.8.1",
    "tailwind-merge": "^3.0.1"
  },
  "devDependencies": {
    "@types/node": "^22.13.4",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.2",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vite": "^6.1.0"
  }
}
```

### Environment Variables (`.env`)
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
VITE_GOOGLE_MAPS_API_KEY=
```
*(If `VITE_GOOGLE_MAPS_API_KEY` is empty or fails to load, the map must seamlessly switch to **Leaflet** with dark tiles).*

---

## 3. Real Geographic Corridor & Seed Data

The real seed data in PostgreSQL is centered on the **Pune Flood Relief Corridor (Maharashtra, India)**:
* **Default Center Coordinates:** `lat: 18.5204`, `lng: 73.8567` (Zoom: `12.5`)

### 3.1 The 5 Helping Points (Depots / Static Hubs)
| Point ID | Name | Agency Type | Latitude | Longitude | Reliability | Initial Available Inventory |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | NDRF Base Camp Alpha | `govt` | `18.5350` | `73.8420` | `0.95` | Water 15,000L, Food 2,000 pkts, Med 500 kits, Teams 12, Amb 4, Boats 6 |
| **2** | Red Cross Central Depot | `ngo` | `18.5110` | `73.8710` | `0.90` | Water 8,000L, Food 5,000 pkts, Med 200 kits, Shelter 300 tents |
| **3** | Municipal General Hospital | `hospital` | `18.5280` | `73.8650` | `0.92` | Medical 800 kits, Ambulance 6 vehicles |
| **4** | Army Logistics Forward Base | `military` | `18.5450` | `73.8300` | `0.98` | Water 20,000L, Food 8,000 pkts, Med 300 kits, Teams 8, Amb 3, Boats 4 |
| **5** | Community Volunteer Hub | `private` | `18.5050` | `73.8550` | `0.75` | Water 3,000L, Food 2,000 pkts, Shelter 100 tents |

### 3.2 The 7 Resource Types
| ID | Name | Unit | Category Icon | Typical Use |
| :--- | :--- | :--- | :--- | :--- |
| `1` | `water` | `liters` | `Droplets` | Potable drinking water tanks |
| `2` | `food` | `packets` | `Utensils` | Emergency dry rations |
| `3` | `medical` | `kits` | `Activity` / `Cross` | First-aid & trauma packs |
| `4` | `rescue_team`| `teams` | `Users` | Specialized search & rescue squads |
| `5` | `ambulance` | `vehicles` | `Truck` | Critical casualty evacuation |
| `6` | `shelter` | `tents` | `Home` / `Tent` | Disaster family refuge tents |
| `7` | `rescue_boat` | `boats` | `LifeBuoy` | Inflatable motorboats for flooded areas |

---

## 4. TypeScript Domain Models & Interfaces

Create `src/types/index.ts`:

```typescript
// ── Scenario ──────────────────────────────────────────────
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

// ── Zones & Needs ─────────────────────────────────────────
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
  scenario_id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  disaster_type: string;
  severity_score: number;       // 0.0 - 1.0
  severity_level: 'low' | 'moderate' | 'high' | 'critical';
  confidence_score: number;     // 0.0 - 1.0
  population_estimate: number;
  status: 'active' | 'stabilizing' | 'resolved';
  needs?: ZoneNeed[];
  needs_summary?: {
    total_needed: number;
    shortage: number;
    balanced: number;
    surplus: number;
  };
}

// ── Helping Points (Depots) ───────────────────────────────
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

// ── Field SOS Reports ─────────────────────────────────────
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

// ── Allocations ───────────────────────────────────────────
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

// ── Unified Dashboard Payload ─────────────────────────────
export interface DashboardData {
  scenario: Scenario;
  kpi: {
    total_zones: number;
    critical_zones: number;
    affected_population: number;
    active_sos_reports: number;
    system_confidence: number;
    total_allocations: number;
    pending_approvals: number;
    resources_in_transit: number;
  };
  zones: Zone[];
  helping_points: HelpingPoint[];
  active_reports: Array<{
    report_id: number;
    lat: number;
    lng: number;
    severity_signal: number;
    verification_status: string;
    zone_name: string | null;
    created_at: string;
  }>;
  supply_lines: Array<{
    allocation_id: number;
    from_lat: number;
    from_lng: number;
    to_lat: number;
    to_lng: number;
    resource_name: string;
    quantity: number;
    status: AllocationStatus;
  }>;
  pending_approvals: Array<{
    allocation_id: number;
    point_name: string;
    zone_name: string;
    resource_name: string;
    quantity: number;
    reasoning: string | null;
  }>;
}

// ── Audit Log ─────────────────────────────────────────────
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
```

---

## 5. Complete REST API Specifications

The frontend communicates with the Node.js API Gateway at `http://localhost:3001/api`.

### 5.1 System Health
* `GET /health`
  * Response: `{ status: "healthy", service: "RESQ Node.js Gateway", version: "2.0.0", timestamp: "..." }`

---

### 5.2 Scenarios
* `GET /api/scenarios`
  * Response: Array of `Scenario` objects ordered by `created_at desc`.
* `POST /api/scenarios`
  * Body: `{ "name": "Pune Monsoon Surge", "description": "Urban inundation simulation", "disaster_type": "flood" }`
  * Response `201 Created`: The created `Scenario`.
* `GET /api/scenarios/:scenarioId`
  * Response: `Scenario` with aggregated `stats`.
* `PATCH /api/scenarios/:scenarioId`
  * Body: `{ "name"?: string, "status"?: "setup"|"running"|"paused"|"completed" }`
* `DELETE /api/scenarios/:scenarioId`

---

### 5.3 Helping Points (Depots & Inventory)
* `GET /api/helping-points`
  * Response: All helping points with flattened `inventory` array containing `resource_name`, `unit`, `total_stock`, `available_stock`, `reserved_stock`, `in_transit`, `max_capacity`, `replenish_rate`.
* `GET /api/helping-points/resources/types`
  * Response: Array of `{ resource_id, name, unit }`.
* `GET /api/helping-points/:pointId`
* `PATCH /api/helping-points/:pointId/inventory`
  * Body: `{ "updates": [{ "resource_id": 1, "available_stock": 12000 }] }`

---

### 5.4 Zones (Disaster Areas)
* `GET /api/scenarios/:scenarioId/zones`
  * Response: All zones for this scenario with `needs` array.
* `POST /api/scenarios/:scenarioId/zones`
  * Body:
    ```json
    {
      "name": "Sangamwadi Lowlands",
      "center_lat": 18.5300,
      "center_lng": 73.8600,
      "radius_m": 850,
      "disaster_type": "flood",
      "severity_level": "critical",
      "severity_score": 0.88,
      "population_estimate": 4500
    }
    ```
  * Response `201 Created`: Created zone + emits `zone.created` via WS.
* `PATCH /api/scenarios/:scenarioId/zones/:zoneId`
  * Body: `{ "severity_score"?: number, "severity_level"?: "low"|"moderate"|"high"|"critical", "status"?: string }`
* `DELETE /api/scenarios/:scenarioId/zones/:zoneId`

---

### 5.5 SOS Field Reports
* `POST /api/scenarios/:scenarioId/reports`
  * Body:
    ```json
    {
      "lat": 18.5312,
      "lng": 73.8614,
      "raw_text": "35 residents trapped on school roof near Sangam bridge, water rising fast, urgent medical and boat support needed",
      "source": "field_report"
    }
    ```
  * Logic: Auto-calculates enclosing zone using Haversine formula, creates report in DB, emits `report.received` on WS, triggers async ML pipeline, and returns `202 Accepted`:
    ```json
    {
      "report_id": 14,
      "scenario_id": "scn_...",
      "zone_id": 1,
      "lat": 18.5312,
      "lng": 73.8614,
      "raw_text": "...",
      "processing_status": "queued"
    }
    ```
* `GET /api/scenarios/:scenarioId/reports` (supports `?status=verified` or `?zone_id=1`)
* `GET /api/scenarios/:scenarioId/reports/:reportId`

---

### 5.6 Allocations (Human-in-the-Loop Supply State Machine)
* `GET /api/scenarios/:scenarioId/allocations` (supports `?status=proposed` or `?zone_id=1`)
* `POST /api/scenarios/:scenarioId/allocations/approve`
  * Body: `{ "allocation_ids": [105, 106] }`
  * State transition: `proposed` → `confirmed`.
  * Database transaction: Reserves stock (`available_stock -= qty`, `reserved_stock += qty`) and increments `quantity_fulfilled` on `zone_needs`.
* `POST /api/scenarios/:scenarioId/allocations/reject`
  * Body: `{ "allocation_ids": [105], "reason": "Alternative NGO closer" }`
  * State transition: `proposed` → `cancelled`.
* `POST /api/scenarios/:scenarioId/allocations/dispatch`
  * Body: `{ "allocation_ids": [105] }`
  * State transition: `confirmed` → `en_route`.
  * Database transaction: Shifts stock from `reserved_stock` to `in_transit`.
* `POST /api/scenarios/:scenarioId/allocations/deliver`
  * Body: `{ "allocation_ids": [105] }`
  * State transition: `en_route` → `delivered`.
  * Database transaction: Deducts `in_transit` and `total_stock`.

---

### 5.7 Unified Dashboard Endpoint
* `GET /api/scenarios/:scenarioId/dashboard`
  * Returns the full `DashboardData` payload in a single high-performance query (KPIs, formatted zones with need status, helping points with utilization %, active SOS reports, supply lines for map vectors, and pending approval cards).

---

### 5.8 Simulation Clock Controls
* `POST /api/scenarios/:scenarioId/simulation/start`
  * Body: `{ "zones": [...] }` (optional bulk zones)
  * Starts simulation, sets status to `running`, triggers initial ML solver.
* `POST /api/scenarios/:scenarioId/simulation/tick`
  * Body: `{ "advance_hours": 1 }`
  * Logic:
    1. Advances scenario `sim_time` by X hours.
    2. Replenishes helping point inventories based on `replenish_rate`.
    3. Auto-delivers any `en_route` shipments whose ETA has elapsed.
    4. Triggers ML agent forecasting and logs audit trail.
    5. Broadcasts `simulation.tick` on WebSocket.
* `POST /api/scenarios/:scenarioId/simulation/pause`
* `POST /api/scenarios/:scenarioId/simulation/resume`

---

### 5.9 Audit Log
* `GET /api/scenarios/:scenarioId/audit-log?limit=50&offset=0&agent_name=CoordinatorAgent`
  * Returns paginated audit trail of AI agent thoughts and system events:
    ```json
    {
      "total": 42,
      "limit": 50,
      "offset": 0,
      "logs": [
        {
          "log_id": 101,
          "agent_name": "VerificationAgent",
          "event_type": "report_verified",
          "reasoning_text": "SOS report verified. No duplicate detected within 500m/30min window.",
          "zone_name": "Sangamwadi Lowlands",
          "point_name": null,
          "created_at": "2026-09-11T12:35:10Z"
        }
      ]
    }
    ```

---

## 6. WebSocket Gateway & Live Event Sync

### 6.1 Connection Initialization
Connect using `socket.io-client`:
```typescript
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export const initSocket = (scenarioId: string): Socket => {
  return io(WS_URL, {
    transports: ['websocket', 'polling'],
    query: { scenario_id: scenarioId },
  });
};
```

### 6.2 All Server Events & Client Action Matrix
| Event Name | Scope | Payload Description | Frontend UI Action |
| :--- | :--- | :--- | :--- |
| `scenario.created` | Global | `{ scenario_id, name, ... }` | Add to scenario dropdown selector |
| `scenario.updated` | Room | Updated scenario object | Update status pill / sim clock |
| `scenario.deleted` | Global | `{ scenario_id }` | Prompt switch to remaining scenario |
| `zone.created` | Room | Created `Zone` object | Render new circle on map & update KPI |
| `zone.updated` | Room | Updated `Zone` object | Update circle severity color & pulse |
| `zone.deleted` | Room | `{ zone_id }` | Remove circle from map |
| `report.received` | Room | Created `Report` object | Drop pulsing red marker on map |
| `report.processed` | Room | `{ report_id, extracted_json, severity_signal, ... }` | Update report marker popup with extracted needs |
| `allocation.approved`| Room | `{ allocation_ids, status: 'confirmed' }` | Move card from Pending to Active ledger |
| `allocation.rejected`| Room | `{ allocation_ids, status: 'cancelled' }` | Remove card from Pending ledger |
| `allocation.dispatched`| Room | `{ allocation_ids, status: 'en_route' }` | Render animated supply vector from depot to zone |
| `allocation.delivered` | Room | `{ allocation_ids, status: 'delivered' }` | Remove supply line vector; mark need satisfied |
| `simulation.started` | Room | `{ scenario_id, sim_time }` | Set play badge; activate clock |
| `simulation.tick` | Room | `{ scenario_id, sim_time, events }` | Flash tick badge; refresh inventory & allocations |
| `simulation.paused` | Room | `{ scenario_id }` | Set paused UI indicator |
| `simulation.resumed` | Room | `{ scenario_id }` | Set running UI indicator |

---

## 7. Map Implementation: Google Maps Primary + Leaflet Fallback

The application must render the interactive map using **Google Maps** when a valid API key is present, and **automatically fall back to Leaflet** if the key is missing or encounters an authentication error.

### 7.1 Visual Elements on the Map
1. **Disaster Zones (Circles):**
   * Center: `[center_lat, center_lng]`, Radius: `radius_m`
   * Severity Fill & Border Colors:
     * `critical`: Crimson `#EF4444` (Fill opacity: `0.3`, animated radar pulse)
     * `high`: Orange `#F97316` (Fill opacity: `0.25`)
     * `moderate`: Amber `#F59E0B` (Fill opacity: `0.2`)
     * `low`: Emerald `#10B981` (Fill opacity: `0.15`)
   * Clickable: Opens **Zone Detail Drawer** displaying population, shortages, and active allocations.
2. **Helping Points (Depots / Hubs):**
   * Custom colored icons according to agency type:
     * `govt` (NDRF): Navy/Blue Shield
     * `military` (Army): Olive Green Tent
     * `hospital`: Red Medical Cross
     * `ngo` (Red Cross): Orange Heart / Box
     * `private` (Volunteers): Cyan Hands
   * Clickable: Opens **Inventory Drawer** showing real-time stock levels.
3. **SOS Field Reports:**
   * Bright red beacon pins with a ping animation.
   * Popup: Displays raw SOS text, time received, and extracted victim count.
4. **Active Supply Lines (Vectors):**
   * Polyline from `from_lat, from_lng` (Helping Point) to `to_lat, to_lng` (Zone Center).
   * Color-coded by status: Cyan `#06B6D4` (dashed animation for `en_route`), Solid Green `#10B981` (for `confirmed`).

### 7.2 Google Maps Dark Tactical Style
Pass this custom style JSON to the Google Map `styles` prop:
```json
[
  { "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#cbd5e1" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0284c7" }, { "lightness": -30 }] }
]
```

### 7.3 Leaflet Fallback Configuration
When falling back to Leaflet:
* Tile Layer: CartoDB Dark Matter
  * URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
  * Attribution: `&copy; OpenStreetMap contributors &copy; CARTO`
* Use `L.circle`, `L.marker` (with SVG `divIcon`), and `L.polyline`.

---

## 8. State Architecture & Context Store

Create `src/context/EmergencyContext.tsx`:
```text
┌─────────────────────────────────────────────────────────────┐
│                    EmergencyProvider                        │
│                                                             │
│  State:                                                     │
│   - activeScenarioId: string                                │
│   - scenario: Scenario | null                               │
│   - kpi: DashboardKPI                                       │
│   - zones: Zone[]                                           │
│   - helpingPoints: HelpingPoint[]                           │
│   - reports: Report[]                                       │
│   - allocations: Allocation[]                               │
│   - auditLogs: AuditLogItem[]                               │
│   - wsConnected: boolean                                    │
│   - isSimRunning: boolean                                   │
│                                                             │
│  Methods:                                                   │
│   - fetchDashboard(scenarioId)                              │
│   - approveAllocations(ids: number[])                       │
│   - rejectAllocations(ids: number[], reason?: string)       │
│   - dispatchAllocations(ids: number[])                      │
│   - deliverAllocations(ids: number[])                       │
│   - submitReport(data: { lat, lng, raw_text })              │
│   - advanceSimTick(hours?: number)                          │
│   - toggleSimPlayPause()                                    │
│   - createScenario(name, type)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. UI Layout & Component Hierarchy

Build the frontend with the following clean, modular structure:

```
src/
├── api/
│   ├── client.ts              # Axios instance with baseURL and error interceptor
│   ├── scenariosApi.ts        # Scenarios CRUD
│   ├── dashboardApi.ts        # GET /scenarios/:id/dashboard
│   ├── allocationsApi.ts      # approve, reject, dispatch, deliver
│   ├── reportsApi.ts          # submit SOS reports
│   ├── simulationApi.ts       # start, tick, pause, resume
│   └── helpingPointsApi.ts    # depots and inventory
├── ws/
│   └── socketClient.ts        # Socket.IO connection manager with scenario room bindings
├── context/
│   └── EmergencyContext.tsx   # Master state provider
├── types/
│   └── index.ts               # Domain types (from Section 4)
├── components/
│   ├── Layout/
│   │   ├── TopCommandBar.tsx  # Scenario select, Sim Clock, Play/Pause, Tick button, WS badge
│   │   └── TacticalKpiStrip.tsx # 4 KPI summary cards
│   ├── Map/
│   │   ├── MapWrapper.tsx     # Detects Google Maps API key; renders GoogleMapCanvas or LeafletMapCanvas
│   │   ├── GoogleMapCanvas.tsx# Google Maps implementation
│   │   ├── LeafletMapCanvas.tsx# Leaflet fallback implementation
│   │   └── MapLayersControl.tsx# Checkboxes: [x] Zones [x] Depots [x] SOS Pins [x] Supply Lines
│   ├── Allocations/
│   │   ├── ApprovalLedger.tsx # Pending AI-proposed allocations with [Approve] / [Reject] buttons
│   │   └── ActiveSupplyTracker.tsx # Confirmed, en-route, and delivered shipment timeline
│   ├── Intelligence/
│   │   ├── AgentReasoningFeed.tsx # Real-time streaming audit feed showing AI thoughts
│   │   └── ZoneMatrix.tsx     # Matrix of zones with shortage/balanced/surplus chips
│   ├── Depots/
│   │   └── DepotInventoryGrid.tsx # Visual progress bars of available vs total stock per depot
│   └── Modals/
│       ├── NewSosReportModal.tsx  # Click map or enter coordinates + SOS text
│       ├── CreateScenarioModal.tsx# Start new disaster simulation session
│       └── ZoneDetailDrawer.tsx   # Detailed zone drilldown
├── App.tsx                    # Root layout uniting command bar, KPI strip, map grid, tabs
└── main.tsx                   # React 18 DOM mount
```

---

## 10. Design Aesthetic Guidelines

1. **Color Palette (Dark Tactical / Emergency Operations Center):**
   * Background: Deep Slate `#0B0F19` and `#111827`
   * Panels & Cards: Glassmorphic Slate `#1E293B` with border `#334155` (`border border-slate-700/60 bg-slate-900/80 backdrop-blur-md`)
   * Accent Colors:
     * **Critical Emergency / SOS:** Red `#EF4444` / Crimson `#DC2626`
     * **High Priority / Warning:** Amber `#F59E0B` / Orange `#F97316`
     * **Operational / Balanced / Safe:** Emerald `#10B981`
     * **Logistics / Supply Vectors:** Cyan `#06B6D4` / Electric Blue `#3B82F6`
2. **Typography & Hierarchy:**
   * Clean sans-serif (`Inter`, `system-ui`). Monospace (`font-mono`) for coordinates, simulation clock, quantities, and decision IDs.
3. **Animations:**
   * Radar pulse on critical disaster zones and new SOS pins.
   * Smooth transition on simulation time increment and stock progress bars.
   * Live badge: Pulsing green dot `animate-ping` for `WS CONNECTED`.

---

## 11. Step-by-Step Instructions for the AI to Generate the Project

If you are asked to generate the complete website, follow this execution sequence:
1. **Initialize Project Files**: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/index.css`.
2. **Define Contracts**: Create `src/types/index.ts` with all types from Section 4.
3. **Build API & WS Layer**:
   * Create `src/api/client.ts` with Axios instance pointing to `http://localhost:3001/api`.
   * Create `src/api/*.ts` for all route endpoints in Section 5.
   * Create `src/ws/socketClient.ts` connecting to `http://localhost:3001` with scenario query parameter.
4. **Implement Global State**: Create `src/context/EmergencyContext.tsx` with unified dashboard data, simulation controls, and WebSocket listeners.
5. **Build Map System**:
   * Create `src/components/Map/GoogleMapCanvas.tsx` using `@react-google-maps/api`.
   * Create `src/components/Map/LeafletMapCanvas.tsx` using `leaflet`.
   * Create `src/components/Map/MapWrapper.tsx` that switches dynamically based on `VITE_GOOGLE_MAPS_API_KEY`.
6. **Build UI Components**:
   * Top Command Bar with clock controller (`+1h` tick button) and scenario picker.
   * KPI metric strip.
   * Approval ledger with one-click **Approve** and **Reject**.
   * Live streaming AI audit feed.
   * SOS incident ingestion modal.
7. **Assemble `App.tsx`**: Ensure zero build or runtime errors, full responsiveness, and immediate data synchronization.
