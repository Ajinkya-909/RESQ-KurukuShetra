# RESQ Database Schema Documentation

**Version:** 2.0 — Final Hackathon Build  
**Database Engine:** PostgreSQL 15+  
**Schema File:** [disaster_relief_schema.sql](../disaster_relief_schema.sql)

---

## 1. Entity Relationship Overview

```text
scenarios (1) ──────┬──── (*) zones ──────── (*) zone_needs
                    │         │
                    │         └──── (*) reports
                    │                    │
                    ├──── (*) allocations ┤
                    │         │          │
                    │         ├── helping_points ── helping_point_inventory
                    │         │
                    │         └── resource_types
                    │
                    ├──── (*) duplicate_flags
                    │
                    └──── (*) audit_log
```

Every simulation run is scoped to a `scenario_id`. This means running "Reset" or "New Simulation" creates a fresh scenario without touching the static helping point data or previous run history.

---

## 2. Table Specifications

### 2.1 `resource_types` — Lookup Table

Static reference table. Never modified at runtime.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `resource_id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing resource identifier |
| `name` | `TEXT` | `NOT NULL UNIQUE` | Resource name: `water`, `food`, `medical`, `rescue_team`, `ambulance`, `shelter`, `rescue_boat` |
| `unit` | `TEXT` | `NOT NULL` | Unit of measurement: `liters`, `packets`, `kits`, `teams`, `vehicles`, `tents`, `boats` |

**Seeded Values (7 resources):**

| resource_id | name | unit |
| :--- | :--- | :--- |
| 1 | water | liters |
| 2 | food | packets |
| 3 | medical | kits |
| 4 | rescue_team | teams |
| 5 | ambulance | vehicles |
| 6 | shelter | tents |
| 7 | rescue_boat | boats |

---

### 2.2 `scenarios` — Simulation Session Isolation

One row per simulation run. Prevents cross-run data collisions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `scenario_id` | `TEXT` | `PRIMARY KEY` | Unique session token (e.g., `"sim_flood_pune_01"` or UUID) |
| `name` | `TEXT` | `NOT NULL` | Human-readable scenario name |
| `description` | `TEXT` | nullable | Optional description |
| `disaster_type` | `TEXT` | `DEFAULT 'flood'` | Primary disaster category |
| `status` | `TEXT` | `CHECK IN (setup, running, paused, completed)` | Simulation lifecycle state |
| `sim_time` | `TIMESTAMPTZ` | `DEFAULT now()` | Current in-simulation clock (advanced via `+1 HR` button) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Real-world creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Real-world last update |

**Why this table exists:** Without `scenario_id`, running two demos back-to-back would merge zones, allocations, and audit logs from both runs into a single messy state. This keeps every simulation isolated.

---

### 2.3 `helping_points` — Static Supply Nodes

Pre-seeded response facilities. Shared across all scenarios (they represent real infrastructure).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `point_id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing identifier |
| `name` | `TEXT` | `NOT NULL` | Facility name (e.g., "NDRF Base Camp Alpha") |
| `type` | `TEXT` | `CHECK IN (ngo, govt, private, hospital, military)` | Agency classification |
| `lat` | `DOUBLE PRECISION` | `NOT NULL` | Latitude coordinate |
| `lng` | `DOUBLE PRECISION` | `NOT NULL` | Longitude coordinate |
| `reliability_score` | `DOUBLE PRECISION` | `DEFAULT 1.0` | Historical delivery reliability (0.0 - 1.0) |
| `arrangement_capability` | `DOUBLE PRECISION` | `DEFAULT 0.0` | Ability to source additional supplies beyond current stock (0.0 - 1.0) |
| `status` | `TEXT` | `CHECK IN (active, overwhelmed, offline)` | Current operational status |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Creation timestamp |

**Seeded Values (5 helping points):**

| point_id | name | type | lat | lng | reliability | arrangement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | NDRF Base Camp Alpha | govt | 18.5350 | 73.8420 | 0.95 | 0.85 |
| 2 | Red Cross Central Depot | ngo | 18.5110 | 73.8710 | 0.90 | 0.60 |
| 3 | Municipal General Hospital | hospital | 18.5280 | 73.8650 | 0.92 | 0.40 |
| 4 | Army Logistics Forward Base | military | 18.5450 | 73.8300 | 0.98 | 0.90 |
| 5 | Community Volunteer Hub | private | 18.5050 | 73.8550 | 0.75 | 0.30 |

---

### 2.4 `helping_point_inventory` — Per-Resource Live Stock Tracking

Each helping point can have multiple rows (one per resource type). Inventory is decremented as allocations are confirmed.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Row identifier |
| `point_id` | `INTEGER` | `FK -> helping_points, ON DELETE CASCADE` | Which facility |
| `resource_id` | `INTEGER` | `FK -> resource_types, ON DELETE CASCADE` | Which resource |
| `total_stock` | `DOUBLE PRECISION` | `DEFAULT 0` | Total units in warehouse (resets each scenario start) |
| `available_stock` | `DOUBLE PRECISION` | `DEFAULT 0` | Units currently available for dispatch |
| `reserved_stock` | `DOUBLE PRECISION` | `DEFAULT 0` | Units reserved by proposed allocations (not yet dispatched) |
| `in_transit` | `DOUBLE PRECISION` | `DEFAULT 0` | Units currently being transported |
| `max_capacity` | `DOUBLE PRECISION` | `DEFAULT 0` | Maximum storage ceiling |
| `replenish_rate` | `DOUBLE PRECISION` | `DEFAULT 0` | Units replenished per simulation hour |
| | | `UNIQUE (point_id, resource_id)` | One row per resource per facility |

**Stock Accounting Rule:**
$$\text{total\_stock} = \text{available\_stock} + \text{reserved\_stock} + \text{in\_transit}$$

When an allocation transitions:
- `proposed` -> `confirmed`: Moves units from `available` to `reserved`
- `confirmed` -> `en_route`: Moves units from `reserved` to `in_transit`
- `en_route` -> `delivered`: Decrements `in_transit` and `total_stock`
- `cancelled`: Returns units back to `available`

---

### 2.5 `zones` — Disaster Regions (Per-Scenario)

Created when the user draws circles on the map. Scoped to a scenario.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `zone_id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing identifier |
| `scenario_id` | `TEXT` | `FK -> scenarios, NOT NULL` | Which simulation run |
| `name` | `TEXT` | `NOT NULL` | Zone label (e.g., "Zone A - Riverside") |
| `center_lat` | `DOUBLE PRECISION` | `NOT NULL` | Center latitude |
| `center_lng` | `DOUBLE PRECISION` | `NOT NULL` | Center longitude |
| `radius_m` | `DOUBLE PRECISION` | `NOT NULL` | Affected radius in meters |
| `disaster_type` | `TEXT` | `DEFAULT 'flood'` | flood, earthquake, cyclone |
| `severity_score` | `DOUBLE PRECISION` | `DEFAULT 0.0` | Computed urgency (0.0 - 1.0), updated by agents |
| `severity_level` | `TEXT` | `CHECK IN (low, moderate, high, critical)` | Human-readable severity tier |
| `confidence_score` | `DOUBLE PRECISION` | `DEFAULT 1.0` | Agent confidence in severity estimate |
| `population_estimate` | `INTEGER` | `DEFAULT 0` | Estimated affected population |
| `status` | `TEXT` | `CHECK IN (active, stabilizing, resolved)` | Zone lifecycle |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Last update timestamp |

---

### 2.6 `zone_needs` — Calculated Resource Requirements

Output of the Needs Assessment Agent. One row per (zone, resource) pair.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Row identifier |
| `zone_id` | `INTEGER` | `FK -> zones, ON DELETE CASCADE` | Which zone |
| `resource_id` | `INTEGER` | `FK -> resource_types, ON DELETE CASCADE` | Which resource |
| `quantity_needed` | `DOUBLE PRECISION` | `DEFAULT 0` | Total units required |
| `quantity_fulfilled` | `DOUBLE PRECISION` | `DEFAULT 0` | Units allocated (sum of confirmed allocations) |
| `fulfillment_status` | `TEXT` | `CHECK IN (shortage, balanced, surplus)` | Computed gap indicator |
| | | `UNIQUE (zone_id, resource_id)` | One row per need per zone |

**Fulfillment Logic:**
- `shortage`: `quantity_fulfilled < quantity_needed * 0.9`
- `balanced`: `0.9 * needed <= fulfilled <= 1.1 * needed`
- `surplus`: `fulfilled > 1.1 * needed`

---

### 2.7 `reports` — Field SOS Reports (Red Dots)

Dynamic incoming reports. Each is a coordinate-based incident.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `report_id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing identifier |
| `scenario_id` | `TEXT` | `FK -> scenarios, NOT NULL` | Which simulation |
| `zone_id` | `INTEGER` | `FK -> zones, nullable` | Which zone (null if independent) |
| `lat` | `DOUBLE PRECISION` | `NOT NULL` | Incident latitude |
| `lng` | `DOUBLE PRECISION` | `NOT NULL` | Incident longitude |
| `raw_text` | `TEXT` | `NOT NULL` | Free-form SOS description |
| `extracted_json` | `JSONB` | nullable | Structured data extracted by NLP agent |
| `severity_signal` | `DOUBLE PRECISION` | `DEFAULT 0.5` | Urgency indicator (0.0 - 1.0) |
| `verification_status` | `TEXT` | `CHECK IN (unverified, verified, duplicate, rejected)` | Verification agent output |
| `source` | `TEXT` | `CHECK IN (initial_seed, field_report, agency_update, simulation)` | Report origin |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Submission timestamp |

**`extracted_json` Example:**
```json
{
  "incident_type": "flood_stranding",
  "stranded_count": 35,
  "vulnerable_population": true,
  "required_resources": [
    { "resource": "rescue_team", "min_qty": 2 },
    { "resource": "medical", "min_qty": 40 }
  ]
}
```

---

### 2.8 `allocations` — Resource Assignment Records

The central operational table. Each row = one helping point sending one resource type to one target.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `allocation_id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing identifier |
| `scenario_id` | `TEXT` | `FK -> scenarios, NOT NULL` | Which simulation |
| `zone_id` | `INTEGER` | `FK -> zones, NOT NULL` | Target zone |
| `report_id` | `INTEGER` | `FK -> reports, nullable` | If set: target is the specific Red Dot. If null: target is zone center. |
| `point_id` | `INTEGER` | `FK -> helping_points, NOT NULL` | Source helping point |
| `resource_id` | `INTEGER` | `FK -> resource_types, NOT NULL` | Which resource |
| `quantity` | `DOUBLE PRECISION` | `NOT NULL` | Amount being dispatched |
| `target_lat` | `DOUBLE PRECISION` | `NOT NULL` | Destination latitude for UI polyline |
| `target_lng` | `DOUBLE PRECISION` | `NOT NULL` | Destination longitude for UI polyline |
| `status` | `TEXT` | `CHECK IN (proposed, confirmed, on_hold, unfulfilled, en_route, delivered, cancelled)` | Allocation lifecycle state |
| `hold_reason` | `TEXT` | nullable | Explanation when status is `on_hold` or `unfulfilled` |
| `eta` | `TIMESTAMPTZ` | nullable | Estimated arrival time |
| `exhaustion_estimate` | `TIMESTAMPTZ` | nullable | When this commitment drains the helping point |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Last status change |

**Allocation Status Lifecycle:**
```text
proposed -> confirmed -> en_route -> delivered
    |           |
    |           +-> cancelled (revoked before dispatch)
    |
    +-> on_hold (resources unavailable, waiting)
    +-> unfulfilled (permanently cannot satisfy)
```

**Key Design Decision:** `report_id IS NULL` means the allocation targets the zone center (macro baseline relief). `report_id IS NOT NULL` means the allocation targets the exact Red Dot SOS coordinate (micro incident response). Both coexist in this single table.

---

### 2.9 `duplicate_flags` — Collision & Overlap Detection

Records caught by the Verification Agent and the Duplicate Detection Agent.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `flag_id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing identifier |
| `scenario_id` | `TEXT` | `FK -> scenarios, NOT NULL` | Which simulation |
| `zone_id` | `INTEGER` | `FK -> zones, nullable` | Related zone |
| `report_id_1` | `INTEGER` | `FK -> reports, nullable` | First duplicate candidate report |
| `report_id_2` | `INTEGER` | `FK -> reports, nullable` | Second duplicate candidate report |
| `allocation_id_1` | `INTEGER` | `FK -> allocations, nullable` | First overlapping allocation |
| `allocation_id_2` | `INTEGER` | `FK -> allocations, nullable` | Second overlapping allocation |
| `duplicate_score` | `DOUBLE PRECISION` | `DEFAULT 0.0` | Composite similarity score (0.0 - 1.0) |
| `resolution` | `TEXT` | `CHECK IN (auto_resolved, needs_review, merged, kept_separate)` | How the conflict was resolved |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Detection timestamp |

---

### 2.10 `audit_log` — Append-Only Agent Reasoning Trail

Every agent decision, system event, and human action is recorded here.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `log_id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing identifier |
| `scenario_id` | `TEXT` | `FK -> scenarios, NOT NULL` | Which simulation |
| `event_type` | `TEXT` | `NOT NULL` | Event category (see list below) |
| `agent_name` | `TEXT` | `DEFAULT 'system'` | Which agent generated this log |
| `zone_id` | `INTEGER` | `FK -> zones, nullable` | Related zone |
| `point_id` | `INTEGER` | `FK -> helping_points, nullable` | Related helping point |
| `allocation_id` | `INTEGER` | `FK -> allocations, nullable` | Related allocation |
| `report_id` | `INTEGER` | `FK -> reports, nullable` | Related report |
| `reasoning_text` | `TEXT` | `NOT NULL` | Plain-English explanation |
| `metadata` | `JSONB` | nullable | Additional structured data (scores, diffs, etc.) |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()` | Log timestamp |

**Event Types:**
- `scenario_started`, `scenario_paused`, `scenario_completed`
- `zone_created`, `zone_severity_updated`
- `report_received`, `report_verified`, `report_duplicate_flagged`
- `needs_assessed`
- `priority_scored`
- `allocation_proposed`, `allocation_confirmed`, `allocation_dispatched`, `allocation_delivered`, `allocation_cancelled`
- `reallocation_triggered`, `reallocation_approved`, `reallocation_rejected`
- `duplicate_flagged`, `conflict_resolved`
- `resource_shortage_detected`, `resource_exhaustion_warning`
- `human_approval_requested`, `human_approval_granted`, `human_approval_denied`

---

## 3. Performance Indexes

| Index Name | Table | Column(s) | Purpose |
| :--- | :--- | :--- | :--- |
| `idx_zones_scenario` | zones | scenario_id | Filter zones by active simulation |
| `idx_reports_scenario` | reports | scenario_id | Filter reports by simulation |
| `idx_reports_zone` | reports | zone_id | Find reports within a zone |
| `idx_reports_verification` | reports | verification_status | Filter by verification state |
| `idx_allocations_scenario` | allocations | scenario_id | Filter allocations by simulation |
| `idx_allocations_zone` | allocations | zone_id | Dashboard zone-to-allocation joins |
| `idx_allocations_point` | allocations | point_id | Dashboard point-to-allocation joins |
| `idx_allocations_status` | allocations | status | Filter active vs completed shipments |
| `idx_zone_needs_zone` | zone_needs | zone_id | Zone detail needs breakdown |
| `idx_audit_log_scenario` | audit_log | scenario_id | Scenario-scoped audit trail |
| `idx_audit_log_created` | audit_log | created_at | Chronological ordering |
| `idx_duplicate_flags_scenario` | duplicate_flags | scenario_id | Scenario-scoped conflict flags |
