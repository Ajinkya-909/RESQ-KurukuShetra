# RESQ — ML Pipeline Architecture & Workflow Lifecycle

This document describes the end-to-end execution flows, agent lifecycles, and integration patterns connecting the **RESQ ML Service** with the **Node.js Gateway** and frontend clients.

---

## 1. Unified ML Intelligence Pipeline Lifecycle

The core intelligence pipeline (`ml/src/pipeline/intelligence.py`) orchestrates five modular computational stages in a deterministic, traceable pipeline.

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Raw State Payload (Zone, Reports, Ops, Inventory, History)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Feature Extraction (12 Features + Provenance Tracking)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Severity Prediction (XGBoost Continuous + 4-Tier Triage) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Demand Forecasting (Polynomial Linear Trend Horizon)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Needs Assessment (Net Shortage = Demand - Zone Inventory)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. OR-Tools Allocation Optimization (MILP Solver)           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Unified Result Output (Severity, Needs, Plan, Provenance)│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Event-Driven System Workflows

The ML engine participates in three primary operational workflows triggered by the Node.js gateway:

### 2.1 Workflow A: Simulation Startup (Initial Allocation)

When a simulation session is initialized:
1. **Request Ingestion**: Node.js calls `POST /ml/initial-allocation` passing all scenario zones and helping points.
2. **Zone Severity Evaluation**: The ML engine builds 12-feature vectors for each zone and evaluates baseline severity via XGBoost.
3. **Sphere/WHO Needs Estimation**: For zones without historical demand, initial needs are synthesized via:
   $$\text{Need} = \text{Population} \times \text{BaseRate} \times \text{SeverityMultiplier} \times \text{DisasterRelevance}$$
4. **Global MILP Optimization**: Google OR-Tools solves simultaneous supply-demand matching across all zones and depots.
5. **Database Mapping**: Allocation results are converted into relational records (`zone_id`, `point_id`, `resource_id`, `quantity`, `target_lat`, `target_lng`).
6. **Persistence & Broadcast**: Node.js persists records to PostgreSQL and broadcasts `simulation_started` via WebSockets.

---

### 2.2 Workflow B: Emergency SOS Report Ingestion & Micro-Reallocation

When a citizen submits an emergency SOS distress report:
1. **Report Ingestion**: Node.js receives the report, associates it with the nearest zone, and calls `POST /ml/process-report`.
2. **NLP Entity Extraction**: The ML service parses text via token and regex extractors:
   - Identifies disaster type (e.g., `flood_stranding`, `medical_emergency`).
   - Extracts stranded citizen counts ($[1, 50\,000]$).
   - Classifies medical urgency (`high`, `moderate`, `low`).
   - Identifies explicitly requested resource tokens (`boat`, `water`, `ambulance`).
3. **Zone Severity Recalibration**: Incorporates the new SOS signal into the zone's telemetry, boosting severity if acute danger is detected.
4. **Target Priority Flagging**: Marks the target zone with `is_sos_target = True` ($2.5\times$ priority multiplier and $90\%$ depot anti-hoarding threshold in the MILP solver).
5. **Micro-Reallocation Solve**: Solves constrained optimization targeting available uncommitted depot supplies directly to the report's exact GPS coordinates.
6. **Multi-Agent Audit Trail Generation**:
   - `VerificationAgent`: Documents report validity and severity classification.
   - `NeedsAgent`: Documents extracted requirements and acute shortages.
   - `CoordinatorAgent`: Explains reallocation rationale, dispatch volume, and depot sources.

---

### 2.3 Workflow C: Temporal Simulation Advance (Tick)

As the simulation clock progresses:
1. **Tick Signal**: Node.js calls `POST /ml/tick` with updated simulation timestamp and current zone states.
2. **Duration Accumulation**: Increments `disaster_duration_hours` for all active disaster zones.
3. **Severity Drift Calculation**: XGBoost re-evaluates severity scores reflecting prolonged resource deprivation and medical load.
4. **Audit Logging**: Emits system tick logs detailing active pipelines and updated severity levels.

---

## 3. Provenance & Explainability Architecture

To ensure transparent decision-making during life-critical operations, every stage in the ML pipeline supports provenance tracking:

```json
{
  "provenance": {
    "features": {
      "affected_population": {
        "source": "zone.population_estimate",
        "raw_value": 25000,
        "resolved_value": 25000.0,
        "defaulted": false
      },
      "road_blocked": {
        "source": "operational_state.road_blocked",
        "raw_value": "blocked",
        "resolved_value": 1.0,
        "defaulted": false
      }
    },
    "needs": {
      "water": {
        "forecast_requirement": 685.0,
        "current_inventory": 200.0,
        "shortage": 485.0,
        "missing_inventory_defaulted": false
      }
    }
  }
}
```

This ensures that emergency coordinators can inspect the exact reasoning chain behind every automated supply dispatch.
