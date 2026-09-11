# RESQ — Frontend Pages, UI Flow & Architecture Specification

> **File:** `frontend/PAGES_AND_FLOW.md`  
> **Target:** Complete UI page breakdown, navigation workflow, component layout, and backend data integration.

---

## 1. Design Principles & Layout Architecture

1. **Zero-Scroll / 100vh Viewport Layout:**
   - Operational pages (Simulation Setup, Live Command Dashboard, Agency Dispatch) are strictly **`h-screen overflow-hidden` (100vh)**.
   - Eliminates standard website scrolling during crisis management.
   - Screen distribution: **65% to 70% width** is dedicated to the **Interactive Tactical Map**, and **30% to 35% width** is dedicated to the **Contextual Action / Telemetry Sidebar**.
2. **Tactical Emergency Operations Center (EOC) Aesthetic:**
   - Background: Dark tactical slate (`#0B0F19` and `#111827`).
   - Cards/Panels: Glassmorphic dark slate with crisp borders (`bg-slate-900/90 border border-slate-700/60 backdrop-blur-md`).
   - Typography: Clean sans-serif with `font-mono` for metrics, coordinates, simulation timestamps, and IDs.
   - High-contrast visual accents: Red (Critical/SOS), Orange/Amber (Moderate/Warning), Emerald (Operational/Delivered), Cyan/Blue (Transit/Logistics).

---

## 2. End-to-End User Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PAGE 1: LANDING / HOME                          │
│  - System Mission Overview                                             │
│  - Select existing Scenario OR Click "New Simulation Session"          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    v
┌────────────────────────────────────────────────────────────────────────┐
│             PAGE 2: SCENARIO SETUP & ZONE CREATION (100vh)             │
│  - Map (70%): Click to drop zone marker (default radius 3km / 800m)    │
│  - Right Form (30%): Name, radius, severity, population, needs         │
│  - Action: Click "Start Simulation" (POST /simulation/start)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    v
┌────────────────────────────────────────────────────────────────────────┐
│             PAGE 3: LIVE OPERATIONS COMMAND DASHBOARD (100vh)          │
│  - Map (70%): Pulsing zones, depot hubs, SOS beacon pins, supply lines │
│  - Top Bar: Sim clock (+1h tick), WS live indicator, scenario status   │
│  - Right Panel (30%): KPIs, Human-in-the-Loop Approvals, Agent Feed   │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    v                                v
┌─────────────────────────────────────┐  ┌───────────────────────────────┐
│ PAGE 4: HELPING POINTS & INVENTORY  │  │ PAGE 5: AGENCY DISPATCH VIEW  │
│ - Depot grid (NDRF, Army, Hospital) │  │ - Filter by agency (Red Cross)│
│ - Live stock bars & replenishment   │  │ - Assigned orders & zones     │
│ - Add / Edit / Restock Hubs         │  │ - Fleet status & routing      │
└─────────────────────────────────────┘  └───────────────────────────────┘
```

---

## 3. Detailed Page Breakdown

---

### PAGE 1: Landing / Mission Home (`/`)

#### Purpose
Entry gateway for disaster operators. Provides an overview of the platform, active emergency alerts, and a selector to enter an active simulation or create a fresh crisis scenario.

#### Layout & Visual Elements
- **Header:** RESQ logo with pulsing operational status badge, documentation link, and quick start button.
- **Hero Section:** High-contrast tactical hero banner explaining the multi-agent orchestration engine.
- **Scenario Selector Cards:**
  - Lists existing scenarios from `GET /api/scenarios` (e.g. *"Pune Monsoon Surge — Status: Running"*).
  - Quick statistics preview per card: Total Zones, Critical Zones, Affected Population.
  - Button: **"Enter Command Room"** → Navigates to Dashboard (`/dashboard/:scenarioId`).
- **New Session Modal / Card:**
  - Input: Scenario Name (e.g. *"Cyclone Vardah Relief"*), Disaster Type (`flood`, `cyclone`, `earthquake`).
  - Action button: **"Configure Disaster Zones"** → Calls `POST /api/scenarios` and navigates to **Page 2: Zone Creation**.

---

### PAGE 2: Scenario Setup & Interactive Zone Creator (`/setup/:scenarioId`)

#### Purpose
The mission planning room. The operator sets up the disaster boundaries directly on the map before launching the simulation engine.

#### 100vh Screen Layout (No-Scroll)
```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Scenario Name | Status: SETUP | 5 Helping Points Loaded | [START SIMULATION]│
├──────────────────────────────────────────────────────┬─────────────────────────────┤
│                                                      │ ZONE CONFIGURATION PANEL    │
│                                                      │ ─────────────────────────── │
│                                                      │ Click on map to place zone: │
│                                                      │ Center: [ 18.5300, 73.8600 ]│
│                                                      │                             │
│                  MAP CANVAS                          │ Zone Name:                  │
│                   (65% - 70%)                        │ [ Sangamwadi Lowlands     ] │
│                                                      │                             │
│  - Google Maps (or Leaflet fallback)                 │ Radius (meters):            │
│  - Click anywhere to spawn a circle                  │ [ 800m                    ] │
│  - Shows existing Helping Points (Depots)            │                             │
│  - Real-time preview of zone radius                  │ Severity Level:             │
│                                                      │ [● Critical ▼] (Red)        │
│                                                      │                             │
│                                                      │ Population Estimate:        │
│                                                      │ [ 4,500                   ] │
│                                                      │                             │
│                                                      │ [ + Save Zone to Scenario ] │
│                                                      │ ─────────────────────────── │
│                                                      │ Added Zones List: (3 zones) │
│                                                      │ 1. Sangamwadi (Critical) [x]│
│                                                      │ 2. Riverside (High)      [x]│
└──────────────────────────────────────────────────────┴─────────────────────────────┘
```

#### Behavior & Interaction
1. **Interactive Point Placement:**
   - Clicking anywhere on the map captures the `lat` and `lng`.
   - A semi-transparent circle immediately renders at the clicked coordinate with a default radius (e.g., `800m` or `3km`).
2. **Right-Side Form Auto-Fill:**
   - Latitude & Longitude fields populate automatically with the clicked coordinates.
   - User customizes:
     - **Zone Name:** (e.g., *"Sangamwadi Sector 4"*).
     - **Radius:** Slider or number input (e.g., `300m` to `5000m`). Circle expands/contracts live on the map.
     - **Severity Level:** Dropdown (`low` = Green, `moderate` = Yellow, `high` = Orange, `critical` = Red).
     - **Disaster Type:** `flood`, `cyclone`, `earthquake`.
     - **Estimated Population:** (e.g., `4500`).
3. **Save Zone Action:**
   - Clicking **"Save Zone"** fires `POST /api/scenarios/:scenarioId/zones`.
   - The zone is added to the backend DB and displayed in the **Added Zones List** below the form.
4. **Launch Simulation Button (`START SIMULATION`):**
   - Prominently positioned in the top right.
   - Disabled if 0 zones have been added.
   - When clicked: Calls `POST /api/scenarios/:scenarioId/simulation/start`.
   - Backend sets status to `running`, triggers initial ML agent allocation solver, and navigates the operator to **Page 3: Live Command Dashboard**.

---

### PAGE 3: Live Operations Command Dashboard (`/dashboard/:scenarioId`)

#### Purpose
The primary high-density, real-time command dashboard where operators monitor disaster zones, incoming SOS field reports, AI-proposed allocations, supply movements, and time progression.

#### 100vh Screen Layout (No-Scroll)
```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: RESQ EOC | Scn: Pune Monsoon | [● RUNNING] | Sim: 11:00 AM | [▶ Play] [+1h Tick] | [WS] │
├────────────────────────────────────────────────────────────────────┬─────────────────────────────┤
│ 4 KPI CARDS: [ 18 Active SOS ] [ 2 Critical Zones ] [ 14.2k Pop ] [ 3 Pending Approvals ]       │
├────────────────────────────────────────────────────────────────────┼─────────────────────────────┤
│                                                                    │ TABBED TELEMETRY SIDEBAR    │
│                       TACTICAL MAP CANVAS                          │ [Approvals] [Needs] [Audit] │
│                           (65% - 70%)                              │ ─────────────────────────── │
│                                                                    │ PENDING ALLOCATIONS (3)     │
│  - Zones: Colored pulsed circles with radius                       │ ┌─────────────────────────┐ │
│  - Helping Points: Custom Depot markers with stock tooltips        │ │ NDRF Base -> Sangamwadi │ │
│  - SOS Reports: Pulsing red beacon pins with victim counts         │ │ 2 Rescue Teams (Critical)│ │
│  - Supply Lines: Animated dashed vectors for in-transit aid        │ │ Reason: 35 trapped roof │ │
│  - Interactive Clicks:                                             │ │ [✓ APPROVE]  [✗ REJECT] │ │
│     * Click Zone -> Opens Zone Needs Drilldown                     │ └─────────────────────────┘ │
│     * Click Depot -> Opens Depot Inventory Drawer                  │ ┌─────────────────────────┐ │
│     * Click Empty Map -> Quick "Submit SOS Report" button          │ │ Red Cross -> Riverside  │ │
│                                                                    │ │ 50 Medical Kits         │ │
│                                                                    │ │ [✓ APPROVE]  [✗ REJECT] │ │
│                                                                    │ └─────────────────────────┘ │
│                                                                    │ ─────────────────────────── │
│                                                                    │ [+ Report Field Emergency]  │
└────────────────────────────────────────────────────────────────────┴─────────────────────────────┘
```

#### Real-Time Telemetry & Interactions
1. **Simulation Clock Control:**
   - Shows current simulated time (`sim_time`).
   - Button **[+1h Tick]**: Calls `POST /api/scenarios/:scenarioId/simulation/tick`.
     - Automatically advances the clock by 1 hour.
     - Depots auto-replenish stock according to `replenish_rate`.
     - In-transit allocations that have reached their ETA auto-deliver.
     - WebSocket broadcasts `simulation.tick` and refreshes all UI counters.
   - Button **[Pause / Resume]**: Toggles simulation running state.
2. **Human-in-the-Loop Allocation Approval Ledger:**
   - Cards display AI-generated proposals with source depot, target zone, resource quantity, and agent reasoning.
   - Action **[Approve]**: Calls `POST /allocations/approve`. Moves status to `confirmed` and reserves stock.
   - Action **[Dispatch]**: Calls `POST /allocations/dispatch`. Moves status to `en_route` and animates a dynamic supply line vector from depot to zone on the map.
   - Action **[Deliver]**: Calls `POST /allocations/deliver`. Marks shipment delivered and updates zone need fulfillment to `balanced`.
3. **Incoming SOS Ingestion Modal:**
   - Button: **[+ Report Field Emergency]** or clicking directly on the map.
   - Modal inputs: Coordinates (`lat`, `lng`), emergency text (e.g. *"Water entering ICU ward, need generator & boats"*).
   - Submits `POST /api/scenarios/:scenarioId/reports`.
   - Immediately drops a red beacon on the map and broadcasts through WebSocket.
4. **Live Agent Reasoning Audit Stream:**
   - Tab 3 in the sidebar displays an auto-scrolling terminal feed of AI thoughts:
     - `[VerificationAgent]` *"Report #14 verified: No duplicate found within 500m/30min."*
     - `[NeedsAgent]` *"Assessed requirement: 2 rescue teams, 40 medical kits."*
     - `[CoordinatorAgent]` *"Proposed allocation from NDRF Base Alpha based on 3.2km proximity."*

---

### PAGE 4: Helping Points & Central Depots (`/depots`)

#### Purpose
Logistics and supply-chain management view. Gives supply officers a holistic view of all static hubs, inventory levels, storage utilization, and replenishment rates.

#### Layout & Capabilities
- **Top Summary KPIs:** Total Potable Water, Total Food Packets, Total Medical Kits, Total Rescue Boats, Available Ambulances.
- **Depot Grid Cards:**
  - Displays each of the 5 primary hubs:
    1. **NDRF Base Camp Alpha** (`govt`)
    2. **Red Cross Central Depot** (`ngo`)
    3. **Municipal General Hospital** (`hospital`)
    4. **Army Logistics Forward Base** (`military`)
    5. **Community Volunteer Hub** (`private`)
  - Each card shows:
    - Agency badge & reliability score (e.g. `0.95`).
    - Utilization progress bar (`(Total - Available) / Total`).
    - Inventory item breakdown table: Total, Available, Reserved, In-Transit, and Hourly Replenishment rate.
- **Inventory Adjustment Action:**
  - Supply officers can click **"Restock / Update Inventory"** to patch available supplies (`PATCH /api/helping-points/:id/inventory`).
- **Add New Helping Point Modal:**
  - Allows registering a new distribution node with coordinates, agency type, and stock allocations (`POST /api/helping-points`).

---

### PAGE 5: Agency Dispatch & Mission View (`/agency`)

#### Purpose
Custom tailored view for individual responding organizations (e.g. NDRF Commander, Red Cross Logistics lead, Army Corps). Instead of viewing all city-wide data, the agency lead selects their organization and sees only their assigned missions.

#### Layout & Capabilities
- **Organization Selector Dropdown:**
  - Switch between:
    * `NDRF (National Disaster Response Force)`
    * `Indian Red Cross Society`
    * `Municipal Health Services (Hospital)`
    * `Army Logistics Corps`
    * `Civil Defence Volunteers`
- **Agency Action Ledger:**
  - Filtered allocation view: shows only shipments where `point_id` belongs to the selected agency.
  - Quick action to **Dispatch Convoy** or **Confirm Delivery**.
  - Route preview: Map zooms in on the specific corridor from the agency's depot to the assigned disaster zone.
- **Resource Readiness Status:**
  - Shows current standby teams, dispatched teams, and fleet availability for that agency only.

---

## 4. UI Component Architecture Tree

```
frontend/src/
├── components/
│   ├── Navigation/
│   │   ├── TopNavBar.tsx              # Scenario switcher, clock, tick controls, WS badge
│   │   └── TabSelector.tsx            # Seamless switching between Dashboard, Depots, Agency
│   ├── Map/
│   │   ├── TacticalMapWrapper.tsx     # Switches Google Maps <-> Leaflet fallback automatically
│   │   ├── GoogleMapEngine.tsx        # Google Maps with dark tactical JSON style
│   │   ├── LeafletMapEngine.tsx       # Leaflet with CartoDB Dark Matter tiles
│   │   ├── ZoneOverlay.tsx            # Color-coded pulsed severity circles
│   │   ├── DepotMarkers.tsx           # Agency-specific depot icons with utilization popups
│   │   ├── SosBeaconMarkers.tsx       # Radar-pinging red SOS report markers
│   │   └── SupplyVectorLines.tsx      # Dynamic animated lines connecting depots to zones
│   ├── KPI/
│   │   └── TacticalKpiStrip.tsx       # 4 high-density metric counters
│   ├── Allocations/
│   │   ├── ApprovalLedger.tsx         # Cards for proposed AI allocations with Approve/Reject
│   │   ├── ActiveTransitTracker.tsx   # En-route shipments with ETA and Deliver action
│   │   └── ReallocationDiffModal.tsx  # Before/After allocation impact comparison
│   ├── Zones/
│   │   ├── ZoneCreatorForm.tsx        # Setup page right-sidebar form (Radius, Severity, Pop)
│   │   └── ZoneDetailDrawer.tsx       # Drilldown of shortages, population, and active aid
│   ├── Intelligence/
│   │   ├── AgentReasoningFeed.tsx     # Streaming live audit trail of agent thought processes
│   │   └── DuplicateAlertBanner.tsx   # Banner notification when duplicate SOS is detected
│   ├── Depots/
│   │   ├── DepotCard.tsx              # Depot card with stock bars and agency badge
│   │   └── RestockModal.tsx           # Quick inventory adjustment modal
│   └── Modals/
│       ├── NewSosReportModal.tsx      # Emergency report ingestion with map coordinate picker
│       └── CreateScenarioModal.tsx    # Create new disaster simulation session
```

---

## 5. Summary Table: Page-to-API Mapping

| Page / Feature | Route / URL | Primary Endpoints Called | WebSocket Events Subscribed |
| :--- | :--- | :--- | :--- |
| **Page 1: Home** | `/` | `GET /api/scenarios`, `POST /api/scenarios` | `scenario.created`, `scenario.deleted` |
| **Page 2: Zone Setup** | `/setup/:id` | `GET /api/helping-points`, `POST .../zones`, `POST .../simulation/start` | `zone.created`, `simulation.started` |
| **Page 3: Command Dashboard** | `/dashboard/:id` | `GET .../dashboard`, `POST .../allocations/*`, `POST .../simulation/tick` | `report.*`, `zone.*`, `allocation.*`, `simulation.tick` |
| **Page 4: Helping Points** | `/depots` | `GET /api/helping-points`, `PATCH .../inventory`, `POST /helping-points` | `helping_point.updated`, `helping_point.created` |
| **Page 5: Agency Dispatch** | `/agency` | `GET .../allocations?point_id=X`, `POST .../allocations/dispatch` | `allocation.dispatched`, `allocation.delivered` |

---

This document represents the complete functional and architectural layout for the RESQ Frontend.
