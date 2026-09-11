# RESQ — Backend API Specification

**Version:** 2.0 — Final Hackathon Build  
**Gateway:** Node.js (Express)  
**ML Service:** Python FastAPI (internal, not directly exposed to frontend)  
**Transport:** REST + WebSocket  
**Base URL:** `http://localhost:3001/api`  
**WebSocket:** `ws://localhost:3001/ws`

---

## Architecture Overview

```text
┌─────────────────────────────────────────┐
│            React Frontend               │
│   REST: http://localhost:3001/api/*      │
│   WS:   ws://localhost:3001/ws          │
└──────────────┬──────────────────────────┘
               │
               v
┌──────────────────────────────────────────┐
│           Node.js Gateway (Express)       │
│  - REST API Routes                        │
│  - WebSocket Hub (socket.io)              │
│  - Orchestrates ML calls                  │
│  - PostgreSQL read/write                  │
└────────┬──────────────┬──────────────────┘
         │              │
  (PostgreSQL)    (Internal HTTP)
         v              v
┌──────────────┐  ┌────────────────────────┐
│  PostgreSQL  │  │  FastAPI ML Service     │
│  (Docker)    │  │  localhost:8000         │
│              │  │  - Agent Pipeline       │
│              │  │  - OR-Tools Solver      │
└──────────────┘  └────────────────────────┘
```

**Key Principle:** The frontend NEVER calls the FastAPI service directly. All requests go through the Node.js gateway, which orchestrates database writes, ML calls, and WebSocket broadcasts.

---

## Table of Contents

1. [Scenarios](#1-scenarios)
2. [Helping Points](#2-helping-points)
3. [Zones](#3-zones)
4. [Reports](#4-reports)
5. [Allocations](#5-allocations)
6. [Simulation](#6-simulation)
7. [Dashboard](#7-dashboard)
8. [Audit Log](#8-audit-log)
9. [WebSocket Events](#9-websocket-events)
10. [Internal ML Endpoints](#10-internal-ml-endpoints)
11. [Error Handling](#11-error-handling)

---

## 1. Scenarios

### `POST /api/scenarios`
Create a new simulation session.

**Request Body:**
```json
{
  "name": "Pune Flood Scenario",
  "description": "5-zone flood simulation with 5 helping points",
  "disaster_type": "flood"
}
```

**Response `201 Created`:**
```json
{
  "scenario_id": "scn_a1b2c3d4",
  "name": "Pune Flood Scenario",
  "description": "5-zone flood simulation with 5 helping points",
  "disaster_type": "flood",
  "status": "setup",
  "sim_time": "2026-09-11T10:00:00.000Z",
  "created_at": "2026-09-11T15:30:00.000Z"
}
```

**Process:**
1. Generate a unique `scenario_id` (prefixed UUID).
2. Insert into `scenarios` table with `status = 'setup'`.
3. Return the full scenario object.

---

### `GET /api/scenarios`
List all scenarios.

**Response `200 OK`:**
```json
[
  {
    "scenario_id": "scn_a1b2c3d4",
    "name": "Pune Flood Scenario",
    "status": "running",
    "disaster_type": "flood",
    "sim_time": "2026-09-11T12:00:00.000Z",
    "created_at": "2026-09-11T15:30:00.000Z"
  }
]
```

---

### `GET /api/scenarios/:scenarioId`
Get a single scenario with summary stats.

**Response `200 OK`:**
```json
{
  "scenario_id": "scn_a1b2c3d4",
  "name": "Pune Flood Scenario",
  "status": "running",
  "disaster_type": "flood",
  "sim_time": "2026-09-11T14:00:00.000Z",
  "stats": {
    "total_zones": 5,
    "critical_zones": 2,
    "active_reports": 8,
    "total_allocations": 23,
    "pending_approvals": 3,
    "affected_population": 19500
  }
}
```

---

### `PATCH /api/scenarios/:scenarioId`
Update scenario status or metadata.

**Request Body:**
```json
{
  "status": "paused"
}
```

**Response `200 OK`:** Updated scenario object.

---

## 2. Helping Points

### `GET /api/helping-points`
List all helping points with their current inventory.

**Response `200 OK`:**
```json
[
  {
    "point_id": 1,
    "name": "NDRF Base Camp Alpha",
    "type": "govt",
    "lat": 18.535,
    "lng": 73.842,
    "reliability_score": 0.95,
    "arrangement_capability": 0.85,
    "status": "active",
    "inventory": [
      {
        "resource_id": 1,
        "resource_name": "water",
        "unit": "liters",
        "total_stock": 15000,
        "available_stock": 12000,
        "reserved_stock": 2000,
        "in_transit": 1000,
        "max_capacity": 20000,
        "replenish_rate": 500
      }
    ]
  }
]
```

**Process:**
1. Query `helping_points` LEFT JOIN `helping_point_inventory` JOIN `resource_types`.
2. Group inventory rows by `point_id`.
3. Return nested array.

---

### `GET /api/helping-points/:pointId`
Get a single helping point with full inventory detail.

**Response:** Same structure as single item from list.

---

### `POST /api/helping-points`
Create a new helping point.

**Request Body:**
```json
{
  "name": "Field Hospital Bravo",
  "type": "hospital",
  "lat": 18.522,
  "lng": 73.855,
  "reliability_score": 0.88,
  "arrangement_capability": 0.50,
  "inventory": [
    { "resource_id": 3, "total_stock": 200, "max_capacity": 400, "replenish_rate": 10 },
    { "resource_id": 5, "total_stock": 2, "max_capacity": 4, "replenish_rate": 0 }
  ]
}
```

**Response `201 Created`:** Full helping point object with generated `point_id`.

**Process:**
1. Insert into `helping_points`.
2. For each inventory item: insert into `helping_point_inventory` with `available_stock = total_stock`.
3. Broadcast WebSocket event `helping_point.created`.

---

### `PATCH /api/helping-points/:pointId/inventory`
Update inventory stock levels for a specific helping point.

**Request Body:**
```json
{
  "updates": [
    { "resource_id": 1, "total_stock": 18000, "available_stock": 16000 }
  ]
}
```

**Response `200 OK`:** Updated inventory array.

---

## 3. Zones

### `POST /api/scenarios/:scenarioId/zones`
Create a new disaster zone within a scenario.

**Request Body:**
```json
{
  "name": "Zone A - Riverside District",
  "center_lat": 18.520,
  "center_lng": 73.856,
  "radius_m": 2000,
  "disaster_type": "flood",
  "severity_level": "high",
  "population_estimate": 5000
}
```

**Response `201 Created`:**
```json
{
  "zone_id": 1,
  "scenario_id": "scn_a1b2c3d4",
  "name": "Zone A - Riverside District",
  "center_lat": 18.520,
  "center_lng": 73.856,
  "radius_m": 2000,
  "disaster_type": "flood",
  "severity_score": 0.0,
  "severity_level": "high",
  "confidence_score": 1.0,
  "population_estimate": 5000,
  "status": "active",
  "needs": []
}
```

**Process:**
1. Insert into `zones` table.
2. Log to `audit_log` with `event_type = 'zone_created'`.
3. Broadcast WebSocket event `zone.created`.

---

### `GET /api/scenarios/:scenarioId/zones`
List all zones for a scenario, with their current needs.

**Response `200 OK`:**
```json
[
  {
    "zone_id": 1,
    "name": "Zone A - Riverside District",
    "center_lat": 18.520,
    "center_lng": 73.856,
    "radius_m": 2000,
    "severity_score": 0.78,
    "severity_level": "high",
    "population_estimate": 5000,
    "status": "active",
    "needs": [
      {
        "resource_name": "water",
        "quantity_needed": 5000,
        "quantity_fulfilled": 3200,
        "fulfillment_status": "shortage"
      },
      {
        "resource_name": "medical",
        "quantity_needed": 120,
        "quantity_fulfilled": 120,
        "fulfillment_status": "balanced"
      }
    ]
  }
]
```

**Process:**
1. Query `zones` WHERE `scenario_id` matches.
2. LEFT JOIN `zone_needs` + `resource_types`.
3. Nest needs under each zone.

---

### `PATCH /api/scenarios/:scenarioId/zones/:zoneId`
Update zone properties (severity, status, etc.).

**Request Body:**
```json
{
  "severity_score": 0.92,
  "severity_level": "critical",
  "status": "active"
}
```

**Response `200 OK`:** Updated zone object.

**Process:**
1. Update `zones` table, set `updated_at = now()`.
2. Log `zone_severity_updated` to `audit_log`.
3. Broadcast WebSocket event `zone.updated`.

---

## 4. Reports

### `POST /api/scenarios/:scenarioId/reports`
Submit a new SOS field report (the "Red Dot" on the map).

**Request Body:**
```json
{
  "lat": 18.518,
  "lng": 73.860,
  "raw_text": "Hospital basement flooded, 40 patients stranded without power. Need immediate medical teams and rescue boats.",
  "source": "field_report"
}
```

**Response `202 Accepted`:**
```json
{
  "report_id": 12,
  "scenario_id": "scn_a1b2c3d4",
  "zone_id": 1,
  "lat": 18.518,
  "lng": 73.860,
  "raw_text": "Hospital basement flooded...",
  "extracted_json": null,
  "severity_signal": 0.5,
  "verification_status": "unverified",
  "source": "field_report",
  "processing_status": "queued"
}
```

**Full Processing Pipeline (async after response):**
1. Insert report into `reports` table with `verification_status = 'unverified'`.
2. Determine `zone_id` by finding the nearest zone whose radius encompasses the report coordinates (haversine distance ≤ zone radius). Set to `null` if no enclosing zone.
3. Broadcast `report.received` via WebSocket.
4. **Call FastAPI ML service** `POST /ml/process-report` with the report + scenario context.
5. ML service runs the agent pipeline:
   - **Incident Intelligence Agent**: Extract structured JSON from `raw_text`.
   - **Verification Agent**: Check for duplicates (semantic + spatial scoring).
   - **Severity Agent**: Score report severity using XGBoost / rule-based fallback.
   - **Needs Assessment Agent**: Calculate required resources.
   - **OR-Tools Solver**: Generate proposed allocations.
6. ML returns proposed allocations + agent reasoning logs.
7. Node.js writes:
   - Update report with `extracted_json`, `severity_signal`, `verification_status`.
   - Insert/update `zone_needs` for affected zone.
   - Insert proposed `allocations` with `status = 'proposed'`.
   - Insert all agent reasoning into `audit_log`.
8. Broadcast `report.processed`, `allocation.proposed` via WebSocket.

---

### `GET /api/scenarios/:scenarioId/reports`
List all reports for a scenario.

**Query Params:**
- `?status=unverified|verified|duplicate|rejected` — filter by verification status
- `?zone_id=1` — filter by zone

**Response `200 OK`:**
```json
[
  {
    "report_id": 12,
    "zone_id": 1,
    "zone_name": "Zone A - Riverside District",
    "lat": 18.518,
    "lng": 73.860,
    "raw_text": "Hospital basement flooded...",
    "extracted_json": {
      "incident_type": "flood_stranding",
      "stranded_count": 40,
      "medical_need": "critical"
    },
    "severity_signal": 0.85,
    "verification_status": "verified",
    "source": "field_report",
    "created_at": "2026-09-11T14:30:00.000Z"
  }
]
```

---

### `GET /api/scenarios/:scenarioId/reports/:reportId`
Get a single report with its related allocations and audit trail.

**Response `200 OK`:**
```json
{
  "report_id": 12,
  "zone_id": 1,
  "lat": 18.518,
  "lng": 73.860,
  "raw_text": "Hospital basement flooded...",
  "extracted_json": { "..." : "..." },
  "severity_signal": 0.85,
  "verification_status": "verified",
  "allocations": [
    {
      "allocation_id": 45,
      "point_name": "NDRF Base Camp Alpha",
      "resource_name": "rescue_team",
      "quantity": 2,
      "status": "proposed"
    }
  ],
  "audit_trail": [
    {
      "log_id": 100,
      "event_type": "report_received",
      "agent_name": "system",
      "reasoning_text": "SOS report received at (18.518, 73.860), assigned to Zone A"
    }
  ]
}
```

---

## 5. Allocations

### `GET /api/scenarios/:scenarioId/allocations`
List all allocations for a scenario. This is the primary data source for the map's supply lines.

**Query Params:**
- `?status=proposed|confirmed|en_route|delivered|cancelled`
- `?zone_id=1`
- `?point_id=2`

**Response `200 OK`:**
```json
[
  {
    "allocation_id": 45,
    "scenario_id": "scn_a1b2c3d4",
    "zone_id": 1,
    "zone_name": "Zone A",
    "report_id": 12,
    "point_id": 1,
    "point_name": "NDRF Base Camp Alpha",
    "point_lat": 18.535,
    "point_lng": 73.842,
    "resource_id": 4,
    "resource_name": "rescue_team",
    "quantity": 2,
    "target_lat": 18.518,
    "target_lng": 73.860,
    "status": "proposed",
    "hold_reason": null,
    "eta": "2026-09-11T15:30:00.000Z",
    "created_at": "2026-09-11T14:35:00.000Z"
  }
]
```

**UI Usage:** The frontend draws an animated dotted polyline from `(point_lat, point_lng)` to `(target_lat, target_lng)` for every allocation with `status IN ('confirmed', 'en_route')`.

---

### `POST /api/scenarios/:scenarioId/allocations/approve`
Approve one or more proposed allocations. This is the Human-in-the-Loop action.

**Request Body:**
```json
{
  "allocation_ids": [45, 46, 47]
}
```

**Response `200 OK`:**
```json
{
  "approved": [45, 46, 47],
  "status": "confirmed",
  "inventory_updated": true
}
```

**Process:**
1. Update `allocations.status` from `proposed` → `confirmed` for each ID.
2. For each allocation: decrement `available_stock` and increment `reserved_stock` on `helping_point_inventory`.
3. Update `zone_needs.quantity_fulfilled` for affected zones.
4. Log `allocation_confirmed` to `audit_log`.
5. Broadcast `allocation.approved` via WebSocket.

---

### `POST /api/scenarios/:scenarioId/allocations/reject`
Reject proposed allocations.

**Request Body:**
```json
{
  "allocation_ids": [48],
  "reason": "Alternative route preferred"
}
```

**Response `200 OK`:**
```json
{
  "rejected": [48],
  "status": "cancelled"
}
```

**Process:**
1. Update `allocations.status` → `cancelled`, set `hold_reason`.
2. Log `allocation_cancelled` to `audit_log`.
3. Broadcast `allocation.rejected` via WebSocket.

---

### `POST /api/scenarios/:scenarioId/allocations/dispatch`
Transition confirmed allocations to `en_route` (simulate dispatch).

**Request Body:**
```json
{
  "allocation_ids": [45, 46]
}
```

**Response `200 OK`:**
```json
{
  "dispatched": [45, 46],
  "status": "en_route"
}
```

**Process:**
1. Update `allocations.status` from `confirmed` → `en_route`.
2. Adjust inventory: move `reserved_stock` → `in_transit`.
3. Log `allocation_dispatched` to `audit_log`.
4. Broadcast `allocation.dispatched` via WebSocket.

---

### `POST /api/scenarios/:scenarioId/allocations/deliver`
Mark allocations as delivered.

**Request Body:**
```json
{
  "allocation_ids": [45]
}
```

**Process:**
1. Update `allocations.status` → `delivered`.
2. Adjust inventory: decrement `in_transit` and `total_stock`.
3. Log `allocation_delivered` to `audit_log`.
4. Broadcast `allocation.delivered` via WebSocket.

---

## 6. Simulation

### `POST /api/scenarios/:scenarioId/simulation/start`
Start the simulation (transition from `setup` → `running`).

**Request Body:**
```json
{
  "zones": [
    {
      "name": "Zone A - Riverside District",
      "center_lat": 18.520,
      "center_lng": 73.856,
      "radius_m": 2000,
      "disaster_type": "flood",
      "severity_level": "high",
      "population_estimate": 5000
    }
  ]
}
```

**Response `200 OK`:**
```json
{
  "scenario_id": "scn_a1b2c3d4",
  "status": "running",
  "zones_created": 5,
  "initial_allocations": 15,
  "message": "Simulation started. Initial allocations computed."
}
```

**Process:**
1. Validate scenario is in `setup` status.
2. Bulk-insert all zones into `zones` table.
3. Send zone + helping point data to FastAPI for initial agent pipeline run.
4. Receive initial allocation proposals from ML service.
5. Insert all allocations into `allocations` with `status = 'proposed'`.
6. Update scenario `status = 'running'`.
7. Broadcast `simulation.started` + `allocation.proposed` via WebSocket.

---

### `POST /api/scenarios/:scenarioId/simulation/tick`
Advance the simulation clock by a fixed interval (e.g., +1 hour). The "+1 HR" button on the UI.

**Request Body:**
```json
{
  "advance_hours": 1
}
```

**Response `200 OK`:**
```json
{
  "scenario_id": "scn_a1b2c3d4",
  "sim_time": "2026-09-11T15:00:00.000Z",
  "events": [
    "Inventory replenished at NDRF Base Camp Alpha (+500L water)",
    "Zone C severity escalated: high → critical",
    "2 new proposed allocations for Zone C"
  ],
  "new_allocations": 2,
  "reallocation_triggered": true
}
```

**Process:**
1. Advance `scenarios.sim_time` by `advance_hours`.
2. Run replenishment: for each helping point inventory row, add `replenish_rate * advance_hours` to `available_stock` (cap at `max_capacity`).
3. Transition `en_route` allocations → `delivered` if `eta < new_sim_time`.
4. Call FastAPI `POST /ml/tick` to run agent analysis at the new time step.
5. If ML returns new allocations or reallocations, insert them.
6. Log all events to `audit_log`.
7. Broadcast `simulation.tick` + any allocation events via WebSocket.

---

### `POST /api/scenarios/:scenarioId/simulation/pause`
Pause the simulation.

**Response `200 OK`:** Updated scenario with `status: "paused"`.

---

### `POST /api/scenarios/:scenarioId/simulation/resume`
Resume a paused simulation.

**Response `200 OK`:** Updated scenario with `status: "running"`.

---

## 7. Dashboard

### `GET /api/scenarios/:scenarioId/dashboard`
Aggregated dashboard data in a single call. Optimized for the command center UI.

**Response `200 OK`:**
```json
{
  "scenario": {
    "scenario_id": "scn_a1b2c3d4",
    "name": "Pune Flood Scenario",
    "status": "running",
    "sim_time": "2026-09-11T14:00:00.000Z"
  },
  "kpi": {
    "total_zones": 5,
    "critical_zones": 2,
    "affected_population": 19500,
    "active_sos_reports": 8,
    "system_confidence": 0.94,
    "total_allocations": 23,
    "pending_approvals": 3,
    "resources_in_transit": 12
  },
  "zones": [
    {
      "zone_id": 1,
      "name": "Zone A",
      "center_lat": 18.520,
      "center_lng": 73.856,
      "radius_m": 2000,
      "severity_level": "critical",
      "severity_score": 0.92,
      "population_estimate": 5000,
      "status": "active",
      "needs_summary": {
        "total_needed": 8,
        "shortage": 3,
        "balanced": 4,
        "surplus": 1
      }
    }
  ],
  "helping_points": [
    {
      "point_id": 1,
      "name": "NDRF Base Camp Alpha",
      "type": "govt",
      "lat": 18.535,
      "lng": 73.842,
      "status": "active",
      "utilization_pct": 45.0,
      "active_allocations": 5
    }
  ],
  "active_reports": [
    {
      "report_id": 12,
      "lat": 18.518,
      "lng": 73.860,
      "severity_signal": 0.85,
      "verification_status": "verified",
      "zone_name": "Zone A"
    }
  ],
  "supply_lines": [
    {
      "allocation_id": 45,
      "from_lat": 18.535,
      "from_lng": 73.842,
      "to_lat": 18.518,
      "to_lng": 73.860,
      "resource_name": "rescue_team",
      "quantity": 2,
      "status": "en_route"
    }
  ],
  "pending_approvals": [
    {
      "allocation_id": 50,
      "point_name": "Red Cross Central Depot",
      "zone_name": "Zone C",
      "resource_name": "medical",
      "quantity": 80,
      "reasoning": "Zone C escalated to critical. Hospital at 96% capacity."
    }
  ]
}
```

**This is the workhorse endpoint.** The frontend calls this on initial load and then relies on WebSocket events for incremental updates.

---

## 8. Audit Log

### `GET /api/scenarios/:scenarioId/audit-log`
Retrieve the agent reasoning trail for a scenario. Powers the "Live Agent Reasoning Stream" panel.

**Query Params:**
- `?limit=50` — max rows (default 50)
- `?offset=0` — pagination offset
- `?agent_name=SeverityAgent` — filter by agent
- `?event_type=allocation_proposed` — filter by event type

**Response `200 OK`:**
```json
{
  "total": 142,
  "logs": [
    {
      "log_id": 200,
      "event_type": "allocation_proposed",
      "agent_name": "CoordinatorAgent",
      "zone_id": 3,
      "zone_name": "Zone C",
      "point_id": 1,
      "point_name": "NDRF Base Camp Alpha",
      "allocation_id": 50,
      "report_id": 12,
      "reasoning_text": "Zone C escalated to CRITICAL (score: 0.92). Allocating 2 rescue teams from NDRF Base Camp Alpha based on proximity (2.3km) and availability (8/12 teams available).",
      "metadata": {
        "severity_before": 0.72,
        "severity_after": 0.92,
        "distance_km": 2.3
      },
      "created_at": "2026-09-11T14:40:02.000Z"
    }
  ]
}
```

---

## 9. WebSocket Events

The Node.js gateway broadcasts real-time events to all connected frontend clients via Socket.IO.

### Connection

```javascript
const socket = io('ws://localhost:3001', {
  query: { scenario_id: 'scn_a1b2c3d4' }
});
```

### Event Catalog

| Event Name | Payload | When Emitted |
| :--- | :--- | :--- |
| `simulation.started` | `{ scenario_id, zones_created, sim_time }` | Simulation begins |
| `simulation.tick` | `{ scenario_id, sim_time, events[] }` | Clock advances |
| `simulation.paused` | `{ scenario_id }` | Simulation paused |
| `simulation.resumed` | `{ scenario_id }` | Simulation resumed |
| `zone.created` | Full zone object | New zone added |
| `zone.updated` | `{ zone_id, severity_score, severity_level, status }` | Zone severity changes |
| `report.received` | `{ report_id, lat, lng, raw_text, zone_id }` | New SOS report submitted |
| `report.processed` | `{ report_id, extracted_json, severity_signal, verification_status }` | ML pipeline completes |
| `allocation.proposed` | Array of proposed allocation objects | New allocations ready for approval |
| `allocation.approved` | `{ allocation_ids[], status: 'confirmed' }` | Human approves allocations |
| `allocation.rejected` | `{ allocation_ids[], status: 'cancelled', reason }` | Human rejects allocations |
| `allocation.dispatched` | `{ allocation_ids[], status: 'en_route' }` | Resources dispatched |
| `allocation.delivered` | `{ allocation_ids[], status: 'delivered' }` | Resources delivered |
| `reallocation.triggered` | `{ reason, affected_zones[], diff }` | Emergency reallocation detected |
| `helping_point.created` | Full helping point object | New helping point added |
| `helping_point.updated` | `{ point_id, status, inventory_changes }` | Helping point status/inventory changes |
| `audit.entry` | Single audit log entry | Every agent decision |
| `resource.shortage` | `{ zone_id, resource_name, deficit }` | Resource gap detected |
| `approval.requested` | `{ allocation_ids[], reasoning, zone_name }` | Approval card should appear |

### Reallocation Diff Event Example

```json
{
  "event": "reallocation.triggered",
  "data": {
    "reason": "Zone C escalated to CRITICAL after hospital flood report",
    "affected_zones": [1, 3],
    "diff": [
      {
        "allocation_id": 30,
        "action": "cancelled",
        "was": { "zone": "Zone A", "resource": "rescue_team", "qty": 1, "point": "NDRF" },
        "reason": "Zone A stable; resources redirected to higher priority"
      },
      {
        "allocation_id": 51,
        "action": "proposed",
        "now": { "zone": "Zone C", "resource": "rescue_team", "qty": 2, "point": "NDRF" },
        "reason": "Zone C critical; 40 patients stranded"
      }
    ]
  }
}
```

---

## 10. Internal ML Endpoints

These are on the **FastAPI ML Service** (port `8000`). Only called by the Node.js gateway, never by the frontend.

### `POST /ml/process-report`
Run the full agent pipeline on a new SOS report.

**Request:**
```json
{
  "report": {
    "report_id": 12,
    "lat": 18.518,
    "lng": 73.860,
    "raw_text": "Hospital basement flooded...",
    "zone_id": 1
  },
  "scenario_context": {
    "scenario_id": "scn_a1b2c3d4",
    "zones": [ "..." ],
    "helping_points": [ "..." ],
    "current_allocations": [ "..." ]
  }
}
```

**Response:**
```json
{
  "report_update": {
    "report_id": 12,
    "extracted_json": { "incident_type": "flood_stranding", "stranded_count": 40 },
    "severity_signal": 0.88,
    "verification_status": "verified"
  },
  "zone_needs_update": [
    { "zone_id": 1, "resource_id": 4, "quantity_needed": 4 }
  ],
  "proposed_allocations": [
    {
      "zone_id": 1,
      "report_id": 12,
      "point_id": 1,
      "resource_id": 4,
      "quantity": 2,
      "target_lat": 18.518,
      "target_lng": 73.860,
      "eta_minutes": 45
    }
  ],
  "audit_entries": [
    {
      "event_type": "report_verified",
      "agent_name": "VerificationAgent",
      "reasoning_text": "No duplicate found within 500m and 30min window. Score: 0.12 (threshold: 0.70)"
    }
  ],
  "reallocation_diff": null
}
```

---

### `POST /ml/initial-allocation`
Run the initial allocation when a simulation starts.

**Request:**
```json
{
  "scenario_id": "scn_a1b2c3d4",
  "zones": [ "..." ],
  "helping_points": [ "..." ]
}
```

**Response:** Same structure as `process-report` but with bulk allocations.

---

### `POST /ml/tick`
Run agent analysis for a time step advance.

**Request:**
```json
{
  "scenario_id": "scn_a1b2c3d4",
  "new_sim_time": "2026-09-11T15:00:00.000Z",
  "current_state": {
    "zones": [ "..." ],
    "allocations": [ "..." ],
    "inventory": [ "..." ]
  }
}
```

**Response:** Updated severity scores, new/reallocated proposals, audit entries.

---

### `GET /ml/health`
Health check for the ML service.

**Response:**
```json
{
  "status": "healthy",
  "models_loaded": ["xgboost_severity", "incident_nlp"],
  "or_tools_available": true
}
```

---

## 11. Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Zone name is required",
    "details": {
      "field": "name",
      "constraint": "NOT NULL"
    }
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Invalid request body or parameters |
| `404` | `NOT_FOUND` | Scenario, zone, report, or allocation not found |
| `409` | `CONFLICT` | Invalid state transition (e.g., approving already-cancelled allocation) |
| `422` | `PROCESSING_ERROR` | ML service returned an error during processing |
| `500` | `INTERNAL_ERROR` | Unexpected server error |
| `503` | `ML_SERVICE_UNAVAILABLE` | FastAPI ML service is not reachable |

### State Transition Validation

The following state transitions are enforced:

| From | Allowed To |
| :--- | :--- |
| `proposed` | `confirmed`, `cancelled`, `on_hold` |
| `confirmed` | `en_route`, `cancelled` |
| `on_hold` | `confirmed`, `cancelled`, `unfulfilled` |
| `en_route` | `delivered` |
| `delivered` | *(terminal)* |
| `cancelled` | *(terminal)* |
| `unfulfilled` | *(terminal)* |
