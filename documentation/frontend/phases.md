# RESQ Frontend Development Phases & Backend Verification

> **File:** `documentation/frontend/phases.md`  
> **Purpose:** Comprehensive verification of backend APIs, WebSocket hub, environment variable configuration, dual-engine map specifications, and step-by-step phased execution plan for the frontend redesign.

---

## 1. Backend Verification & Architecture Health Check

Before beginning frontend development, the backend APIs and infrastructure have been verified:

### 1.1 REST Endpoints Verification
| Route Module | Base Path | Key Methods | Operational Verification |
| :--- | :--- | :--- | :--- |
| **System Health** | `/health` | `GET` | Returns 200 with service heartbeat & version. |
| **Scenarios** | `/api/scenarios` | `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id` | Creates session IDs (`scn_...`), aggregates stats, manages lifecycle (`setup`, `running`, `paused`, `completed`). |
| **Helping Points** | `/api/helping-points` | `GET`, `GET /resources/types`, `GET /:id`, `POST`, `PATCH /:id`, `PATCH /:id/inventory` | Returns the 5 static Pune hubs with flattened inventory (7 resource types) and atomic inventory patch support. |
| **Zones** | `/api/scenarios/:id/zones` | `GET`, `POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id` | Spatial zones with radius in meters, severity scores (`low`, `moderate`, `high`, `critical`), and need status. |
| **SOS Reports** | `/api/scenarios/:id/reports` | `POST`, `GET`, `GET /:id` | Ingests SOS messages, calculates enclosing zone via Haversine distance, creates DB entry, emits `report.received` on WebSocket, triggers async ML pipeline. |
| **Allocations** | `/api/scenarios/:id/allocations` | `GET`, `POST /approve`, `POST /reject`, `POST /dispatch`, `POST /deliver` | State machine transitions wrapped in `prisma.$transaction()` to deduct/reserve depot inventory and update zone need satisfaction. |
| **Dashboard** | `/api/scenarios/:id/dashboard` | `GET` | **Master Endpoint:** Returns complete aggregated command center payload (scenario, KPIs, zones with needs, depots with utilization %, active SOS reports, supply lines, pending approvals). |
| **Simulation** | `/api/scenarios/:id/simulation` | `POST /start`, `POST /tick`, `POST /pause`, `POST /resume` | Starts engine, ticks clock by +1h (auto-replenishes depot stocks and auto-delivers shipments past ETA). |
| **Audit Log** | `/api/scenarios/:id/audit-log` | `GET` | Paginated immutable record of AI multi-agent reasoning (`VerificationAgent`, `NeedsAgent`, `CoordinatorAgent`). |

### 1.2 WebSocket Hub & Room Isolation Verification
* **Server Entrypoint:** `backend/src/index.js` mounts `socket.io` on HTTP port `3001`.
* **Connection Handshake:** Handshake query `query: { scenario_id: activeScenarioId }`.
* **Room Management:** [socketManager.js](file:///d:/CodingContent/Web%20Development/RESQ-KurukuShetra/backend/src/ws/socketManager.js) automatically binds connected sockets to `scenario:${scenarioId}`.
* **Broadcasted Events:**
  * Room Events: `zone.created`, `zone.updated`, `zone.deleted`, `report.received`, `report.processed`, `allocation.approved`, `allocation.rejected`, `allocation.dispatched`, `allocation.delivered`, `simulation.started`, `simulation.tick`, `simulation.paused`, `simulation.resumed`.
  * Global Events: `scenario.created`, `scenario.deleted`, `helping_point.created`, `helping_point.updated`.

### 1.3 Environment & CORS Alignment
* **Backend Port:** `3001`
* **Frontend Port:** `3000` (Vite configured for `http://localhost:3000`)
* **CORS Note:** `backend/.env` must specify `CORS_ORIGIN=http://localhost:3000` (or support both 3000 & 5173) so Express and Socket.IO accept frontend requests without CORS errors.
* **Frontend Environment:**
  ```env
  VITE_API_BASE_URL=http://localhost:3001/api
  VITE_WS_URL=http://localhost:3001
  VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
  ```

### 1.4 Dual-Engine Map Specification
* **Primary Engine: Google Maps:**
  * Configured with `VITE_GOOGLE_MAPS_API_KEY`.
  * Tactical Night Mode JSON styling.
  * Interactive features: click-to-place zone coordinate picker, radius circles color-coded by severity, depot markers with agency badges, pulsing red SOS pins, animated supply vector polylines.
* **Fallback Engine: Leaflet:**
  * Automatically activated if `VITE_GOOGLE_MAPS_API_KEY` is empty, invalid, or fails to load.
  * Uses CartoDB Dark Matter tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
  * Renders identical layers (`L.circle`, `L.marker`, `L.polyline`).

---

## 2. Phased Frontend Development Plan

We divide the frontend development into **6 structured phases**:

```text
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Project Scaffolding, Data Types & API/WS Clients   │
├─────────────────────────────────────────────────────────────┤
│ PHASE 2: Dual-Engine Tactical Map (Google Maps + Leaflet)   │
├─────────────────────────────────────────────────────────────┤
│ PHASE 3: Page 1 (Home) & Page 2 (100vh Zone Setup Engine)   │
├─────────────────────────────────────────────────────────────┤
│ PHASE 4: Page 3 (100vh Live Command Dashboard & Approvals)  │
├─────────────────────────────────────────────────────────────┤
│ PHASE 5: Page 4 (Depots Hub) & Page 5 (Agency Operations)   │
├─────────────────────────────────────────────────────────────┤
│ PHASE 6: End-to-End Simulation Verification & Polish        │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Project Scaffolding, Data Types & Core Services
**Objective:** Establish the clean foundation, configure dependencies, set up TypeScript domain interfaces, and build the networking layer (REST API and WebSocket).

**Tasks:**
1. **Package & Build Configuration:**
   - Configure `frontend/package.json` with React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, `@react-google-maps/api`, `leaflet`, `@types/leaflet`, `axios`, and `socket.io-client`.
   - Setup `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, and `index.html`.
   - Setup `.env` and `.env.example` with `VITE_API_BASE_URL`, `VITE_WS_URL`, and `VITE_GOOGLE_MAPS_API_KEY`.
2. **TypeScript Domain Models (`src/types/index.ts`):**
   - Implement complete interfaces: `Scenario`, `Zone`, `ZoneNeed`, `HelpingPoint`, `InventoryItem`, `Report`, `Allocation`, `DashboardData`, `AuditLogItem`.
3. **API Client Layer (`src/api/`):**
   - `client.ts`: Axios instance with standard error interceptor.
   - `scenariosApi.ts`: CRUD for simulation scenarios.
   - `dashboardApi.ts`: Call `GET /api/scenarios/:id/dashboard`.
   - `zonesApi.ts`: Create and manage disaster zones.
   - `allocationsApi.ts`: Actions (`/approve`, `/reject`, `/dispatch`, `/deliver`).
   - `reportsApi.ts`: Ingest SOS field reports (`POST /reports`).
   - `simulationApi.ts`: Controls (`/start`, `/tick`, `/pause`, `/resume`).
   - `helpingPointsApi.ts`: Depots list, types, and inventory patching.
4. **WebSocket Manager (`src/ws/socketClient.ts`):**
   - Socket.IO connection manager that connects to `http://localhost:3001` with `scenario_id` query param and exposes clean event subscription hooks.
5. **Master Global State (`src/context/EmergencyContext.tsx`):**
   - Stores active scenario, KPI counters, zones, depots, allocations, SOS reports, audit logs, simulation clock state, and WebSocket connection status.

---

### Phase 2: Dual-Engine Tactical Map Component
**Objective:** Build a resilient, high-performance map canvas that runs Google Maps when an API key is present and automatically switches to Leaflet when it is not.

**Tasks:**
1. **Map Wrapper (`src/components/Map/TacticalMapWrapper.tsx`):**
   - Checks `VITE_GOOGLE_MAPS_API_KEY`.
   - Renders `GoogleMapEngine` or gracefully falls back to `LeafletMapEngine`.
2. **Google Maps Engine (`src/components/Map/GoogleMapEngine.tsx`):**
   - Night mode tactical styling JSON.
   - Default center on Pune corridor (`18.5204, 73.8567`).
   - Click listener for interactive coordinate selection in setup mode.
   - Layers:
     - `google.maps.Circle` for zones (color-coded by severity: critical=red, high=orange, moderate=yellow, low=green).
     - `google.maps.Marker` for depots (custom agency icons).
     - Pulsing red beacon markers for active SOS reports.
     - `google.maps.Polyline` for active supply lines.
3. **Leaflet Fallback Engine (`src/components/Map/LeafletMapEngine.tsx`):**
   - CartoDB Dark Matter tile layer.
   - Renders identical visual layers using `L.circle`, `L.divIcon`, and `L.polyline`.
4. **Map Control Bar (`src/components/Map/MapControls.tsx`):**
   - Recenter on Pune button.
   - Layer toggles: `[x] Zones`, `[x] Depots`, `[x] SOS Pins`, `[x] Supply Lines`.

---

### Phase 3: Landing Home & 100vh Zone Setup Engine
**Objective:** Build Page 1 (Landing) and Page 2 (Zero-Scroll Interactive Zone Creator).

**Tasks:**
1. **Landing / Home Page (`src/pages/HomePage.tsx`):**
   - Mission banner and active scenario browser (`GET /api/scenarios`).
   - "New Disaster Simulation" card opening modal to name and initialize a new scenario (`POST /api/scenarios`).
   - Quick navigation into active scenarios.
2. **Scenario Setup & Zone Creator Page (`src/pages/SetupPage.tsx`):**
   - **100vh Zero-Scroll Layout:**
     - Left (65-70% width): Interactive map canvas.
     - Right (30-35% width): Zone configuration form panel.
   - **Interactive Zone Placement:**
     - Clicking anywhere on the map drops a marker and renders a default radius circle (`800m` or `3km`).
     - Form auto-fills clicked `lat` and `lng`.
     - Operator configures: Zone Name, Radius slider, Severity Level (`critical`, `high`, `moderate`, `low`), and Population.
     - Action **"Save Zone"** fires `POST /api/scenarios/:id/zones` and adds the zone to the DB and local map list.
     - Added Zones list displays active zones with delete actions.
   - **Start Simulation Action:**
     - Top bar button: **"START SIMULATION"** calls `POST /api/scenarios/:id/simulation/start`.
     - Automatically transitions to the Live Command Dashboard.

---

### Phase 4: 100vh Live Command Dashboard & Approvals Ledger
**Objective:** Build the core real-time operations command center (Page 3).

**Tasks:**
1. **Top Command & Simulation Bar (`src/components/Header/CommandHeader.tsx`):**
   - Active Scenario badge (`RUNNING`, `PAUSED`).
   - Simulation Clock display with **`[+1h Tick]`** button, **`[Play/Pause]`** button.
   - Live WebSocket connection status pill (`animate-ping` green dot for Connected).
   - Quick action button: **`[+ Report SOS Incident]`**.
2. **Tactical KPI Metric Strip (`src/components/KPI/TacticalKpiStrip.tsx`):**
   - 4 prominent metric cards: Active SOS Reports, Critical Disaster Zones, Affected Population, Pending Human Approvals.
3. **Live Dashboard Map View:**
   - 65-70% width map displaying real-time zones, depots, SOS pins, and animated supply line vectors.
   - Clicking a zone opens the Zone Needs drilldown drawer.
   - Clicking a depot opens the Depot Inventory drawer.
4. **Human-in-the-Loop Allocation Approval Ledger (`src/components/Allocations/ApprovalLedger.tsx`):**
   - Displays AI-proposed allocation cards with source depot, target zone, resource quantity, and agent reasoning text.
   - Action buttons:
     - **`[Approve]`** (`POST /allocations/approve`) → Reserves stock, updates zone need.
     - **`[Reject]`** (`POST /allocations/reject`).
     - **`[Dispatch]`** (`POST /allocations/dispatch`) → Shifts stock to in-transit, animates supply line on map.
     - **`[Deliver]`** (`POST /allocations/deliver`) → Deducts stock, marks delivery confirmed.
5. **AI Multi-Agent Live Audit Stream (`src/components/Intelligence/AgentReasoningFeed.tsx`):**
   - Auto-scrolling streaming audit log showing agent thoughts from `VerificationAgent`, `NeedsAgent`, and `CoordinatorAgent`.
6. **SOS Incident Reporting Modal (`src/components/Modals/NewSosModal.tsx`):**
   - Allows typing raw field report text and picking coordinates on map.
   - Submits `POST /reports`, dropping an immediate beacon on map and triggering backend ML pipeline.

---

### Phase 5: Helping Points Hub & Agency Dispatch Operations
**Objective:** Build logistics management (Page 4) and agency-specific dispatch views (Page 5).

**Tasks:**
1. **Helping Points & Central Depots Page (`src/pages/DepotsPage.tsx`):**
   - Overview of all 5 depots (NDRF, Red Cross, Hospital, Army, Volunteers).
   - Visual progress bars for stock utilization: Available vs Reserved vs In-Transit vs Total.
   - Hourly replenishment rates for water, food, and medical kits.
   - Inventory Restock modal calling `PATCH /api/helping-points/:id/inventory`.
2. **Agency Dispatch & Mission Page (`src/pages/AgencyPage.tsx`):**
   - Agency selector dropdown (NDRF, Red Cross, Municipal Hospital, Army Corps, Volunteers).
   - Filtered view showing only dispatches originating from that organization's depot.
   - Quick **Dispatch** and **Confirm Delivery** action buttons for convoy commanders.
   - Map zooms in on specific agency supply corridors.

---

### Phase 6: End-to-End Integration, Resilience & Polish
**Objective:** Validate all user journeys, verify zero console errors, and ensure seamless WebSocket updates.

**Tasks:**
1. **End-to-End Workflow Verification:**
   - Create new scenario → Place 3 disaster zones on map → Start simulation.
   - Ingest SOS report → Observe radar ping and extracted JSON from ML stub.
   - Approve allocation → Verify inventory deduction and transit line on map.
   - Click `+1h Tick` → Observe simulation clock advance, auto-delivery of shipments, and inventory replenishment.
2. **WebSocket Synchronization Test:**
   - Confirm all 14 server events update the UI reactively without page reloads.
3. **Map Fallback Test:**
   - Verify Google Maps loads when key is supplied.
   - Verify Leaflet takes over smoothly when key is omitted or invalid.
4. **Build & Lint Validation:**
   - Execute `npm run build` and ensure TypeScript and Vite compile with 0 errors.

---

## 3. Ready for Execution

With this phased specification approved, we can proceed directly into **Phase 1 (Scaffolding & Infrastructure)**.
