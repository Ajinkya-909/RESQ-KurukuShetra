# RESQ — ML Service API Specification

**Version:** 2.0.0  
**Framework:** FastAPI (Python 3.10+)  
**Server / ASGI:** Uvicorn  
**Default Port:** `8001` (Configurable via `ML_PORT`, fallback `8000`)  
**Base URL:** `http://localhost:8001`  
**Access Scope:** Internal Service (Invoked exclusively by the Node.js API Gateway `mlClient.js`; not directly exposed to public clients/frontend)

---

## 1. Overview & Service Principles

The RESQ ML Service is an asynchronous, high-throughput microservice responsible for:
1. **Disaster Triage**: Continuous severity prediction ($[0.0, 1.0]$) and 4-tier categorization (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
2. **Predictive Forecasting**: Multi-period trend extrapolation for humanitarian supplies.
3. **Needs Assessment**: Exact deficit calculation between forecast demand and on-the-ground zone inventory.
4. **Constrained Optimization**: Google OR-Tools Mixed Integer Linear Programming (MILP) solver for multi-depot, multi-zone supply dispatch.
5. **Real-Time SOS Processing**: NLP entity extraction, emergency priority boosting, and preemptive resource reallocation.

---

## 2. Endpoints Summary

| Method | Endpoint | Purpose | Caller / Consumer |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Core microservice health check | Monitoring / Gateway |
| `GET` | `/ml/health` | ML service health alias | Node.js `mlClient.checkHealth()` |
| `POST` | `/predict/severity` | Direct 12-feature XGBoost severity inference | Internal testing / Analytics |
| `POST` | `/intelligence/analyze` | End-to-end single zone intelligence pipeline | Evaluation & Benchmarks |
| `POST` | `/ml/process-report` | Triage incoming SOS report & trigger global reallocation | Node.js `mlClient.processReport()` |
| `POST` | `/ml/initial-allocation` | Compute initial allocation plan at simulation startup | Node.js `mlClient.initialAllocation()` |
| `POST` | `/ml/tick` | Re-evaluate zone states on simulation time advance | Node.js `mlClient.tick()` |

---

## 3. Endpoints Detail

### 3.1 `GET /health` & `GET /ml/health`

Returns operational status, service name, and running version.

#### Response `200 OK`
```json
{
  "status": "healthy",
  "service": "RESQ ML Service",
  "version": "2.0.0"
}
```

---

### 3.2 `POST /predict/severity`

Evaluates a raw 12-feature operational vector and returns continuous severity score and discrete operational classification.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Schema (`SeverityRequest`)
All 12 features are required. Extra unknown keys are rejected with `422 Unprocessable Entity`.

| Field | Type | Valid Range | Description |
| :--- | :--- | :--- | :--- |
| `affected_population` | `float` | $[0.0, 1\,000\,000.0]$ | Estimated count of vulnerable/affected citizens in zone |
| `stranded_people` | `float` | $[0.0, 100\,000.0]$ | Count of individuals trapped/cut off from safety |
| `water_level` | `float` | $[0.0, 1.0]$ | Normalized floodwater severity score ($0.0 = \text{dry}$, $1.0 = \text{catastrophic}$) |
| `hospital_occupancy` | `float` | $[0.0, 1.0]$ | Zone medical capacity utilization ratio ($1.0 = 100\%$ full) |
| `medical_cases` | `float` | $[0.0, 50\,000.0]$ | Active reported medical emergencies / casualties |
| `road_blocked` | `float` | $[0.0, 1.0]$ | Access restriction flag ($1.0 = \text{blocked}$, $0.0 = \text{clear}$) |
| `sos_count` | `float` | $[0.0, 10\,000.0]$ | Number of active citizen distress signals |
| `shelter_occupancy` | `float` | $[0.0, 1.0]$ | Emergency camp occupancy ratio |
| `food_shortage_ratio` | `float` | $[0.0, 1.0]$ | Ratio of unmet nutritional demand |
| `water_shortage_ratio` | `float` | $[0.0, 1.0]$ | Ratio of unmet clean water demand |
| `disaster_duration_hours` | `float` | $[0.0, 720.0]$ | Elapsed hours since initial disaster onset (up to 30 days) |
| `population_vulnerability` | `float` | $[0.0, 1.0]$ | Vulnerability index (elderly, infants, socio-economic baseline) |

#### Example Request
```json
{
  "affected_population": 45000.0,
  "stranded_people": 1200.0,
  "water_level": 0.85,
  "hospital_occupancy": 0.95,
  "medical_cases": 350.0,
  "road_blocked": 1.0,
  "sos_count": 85.0,
  "shelter_occupancy": 0.90,
  "food_shortage_ratio": 0.70,
  "water_shortage_ratio": 0.80,
  "disaster_duration_hours": 14.5,
  "population_vulnerability": 0.75
}
```

#### Response `200 OK` (`SeverityResponse`)
```json
{
  "severity_score": 0.8842,
  "severity_level": "CRITICAL",
  "model": "xgboost",
  "model_version": "1.0.0"
}
```

---

### 3.3 `POST /intelligence/analyze`

Executes the complete unified single-zone intelligence pipeline: Feature Engineering $\to$ Severity Prediction $\to$ Demand Forecasting $\to$ Needs Assessment $\to$ OR-Tools Supply Allocation.

#### Request Schema (`IntelligenceAnalyzeRequest`)
```json
{
  "zone": {
    "zone_id": "ZONE_PUNE_01",
    "population_estimate": 25000,
    "disaster_duration_hours": 12.0,
    "population_vulnerability": 0.70
  },
  "reports": [
    {
      "stranded_people": 120,
      "medical_cases": 45,
      "severity_signal": 0.85
    }
  ],
  "operational_state": {
    "water_level": 0.75,
    "hospital_occupancy": 0.80,
    "shelter_occupancy": 0.60,
    "road_blocked": true,
    "food_shortage_ratio": 0.40,
    "water_shortage_ratio": 0.50
  },
  "historical_demand": {
    "water": [300.0, 350.0, 420.0, 490.0],
    "food": [150.0, 180.0, 210.0, 240.0],
    "medical_kits": [20.0, 25.0, 35.0, 45.0]
  },
  "zone_inventory": {
    "water": 200.0,
    "food": 100.0,
    "medical_kits": 10.0
  },
  "helping_points": [
    {
      "helping_point_id": "DEPOT_CENTRAL_01",
      "inventory": {
        "water": 1000.0,
        "food": 500.0,
        "medical_kits": 100.0
      }
    }
  ],
  "horizon": 3,
  "include_provenance": true
}
```

#### Response `200 OK`
```json
{
  "zone_id": "ZONE_PUNE_01",
  "severity": {
    "score": 0.8124,
    "level": "CRITICAL",
    "model": "xgboost",
    "model_version": "1.0.0"
  },
  "forecast": {
    "water": [555.0, 620.0, 685.0],
    "food": [270.0, 300.0, 330.0],
    "medical_kits": [53.5, 62.0, 70.5]
  },
  "needs": {
    "water": 485.0,
    "food": 230.0,
    "medical_kits": 60.5
  },
  "allocation": {
    "status": "OPTIMAL",
    "allocations": [
      {
        "zone_id": "ZONE_PUNE_01",
        "helping_point_id": "DEPOT_CENTRAL_01",
        "resource": "food",
        "quantity": 230.0
      },
      {
        "zone_id": "ZONE_PUNE_01",
        "helping_point_id": "DEPOT_CENTRAL_01",
        "resource": "medical_kits",
        "quantity": 60.5
      },
      {
        "zone_id": "ZONE_PUNE_01",
        "helping_point_id": "DEPOT_CENTRAL_01",
        "resource": "water",
        "quantity": 485.0
      }
    ],
    "unmet_demand": {},
    "summary": {
      "total_requested": 775.5,
      "total_allocated": 775.5,
      "total_unmet": 0.0
    }
  },
  "provenance": {
    "features": {
      "affected_population": {
        "source": "zone.population_estimate",
        "raw_value": 25000,
        "resolved_value": 25000.0,
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

---

### 3.4 `POST /ml/process-report`

Processes an incoming SOS emergency field report, runs NLP entity extraction, predicts report severity, applies emergency multipliers, and executes global reallocation across all scenario zones and helping points.

#### Request Schema
```json
{
  "report": {
    "report_id": 42,
    "zone_id": 3,
    "lat": 18.5204,
    "lng": 73.8567,
    "raw_text": "Hospital basement flooded! 45 patients trapped on upper floor without drinking water and urgent medical attention required!",
    "needed_resources": ["water", "medical", "rescue_boat"]
  },
  "scenario_context": {
    "scenario_id": "scn_pune_flood_01",
    "zones": [
      {
        "zone_id": 3,
        "name": "Zone C - Riverside Hospital",
        "center_lat": 18.5204,
        "center_lng": 73.8567,
        "population_estimate": 12000,
        "severity_score": 0.65,
        "severity_level": "high",
        "disaster_type": "flood",
        "zone_needs": []
      },
      {
        "zone_id": 1,
        "name": "Zone A - Old Town",
        "center_lat": 18.5312,
        "center_lng": 73.8445,
        "population_estimate": 8000,
        "severity_score": 0.40,
        "severity_level": "moderate",
        "disaster_type": "flood",
        "zone_needs": []
      }
    ],
    "helping_points": [
      {
        "point_id": 101,
        "name": "NDRF Camp Alpha",
        "lat": 18.5300,
        "lng": 73.8500,
        "status": "active",
        "inventory": [
          { "resource_id": 1, "resource_name": "water", "available_stock": 2000 },
          { "resource_id": 2, "resource_name": "food", "available_stock": 1000 },
          { "resource_id": 3, "resource_name": "medical", "available_stock": 150 },
          { "resource_id": 4, "resource_name": "rescue_boat", "available_stock": 10 }
        ]
      }
    ],
    "current_allocations": []
  }
}
```

#### Response `200 OK`
```json
{
  "report_update": {
    "report_id": 42,
    "extracted_json": {
      "incident_type": "flood_stranding",
      "stranded_count": 45,
      "medical_need": "high",
      "required_resources": ["water", "medical", "rescue_boat"]
    },
    "severity_signal": 0.892,
    "verification_status": "verified"
  },
  "zone_needs_update": [],
  "proposed_allocations": [
    {
      "zone_id": 3,
      "point_id": 101,
      "resource_id": 1,
      "quantity": 135.0,
      "target_lat": 18.5204,
      "target_lng": 73.8567
    },
    {
      "zone_id": 3,
      "point_id": 101,
      "resource_id": 3,
      "quantity": 20.0,
      "target_lat": 18.5204,
      "target_lng": 73.8567
    },
    {
      "zone_id": 3,
      "point_id": 101,
      "resource_id": 4,
      "quantity": 2.0,
      "target_lat": 18.5204,
      "target_lng": 73.8567
    }
  ],
  "audit_entries": [
    {
      "event_type": "report_verified",
      "agent_name": "VerificationAgent",
      "reasoning_text": "Report verified via ML severity analysis. Score: 0.89 (CRITICAL). Assigned to zone 3."
    },
    {
      "event_type": "reallocation_proposed",
      "agent_name": "CoordinatorAgent",
      "reasoning_text": "SOS Report #42 triggered preemptive resource reallocation. Evaluated unallocated depot stock and proposed 3 allocations (157 units) with priority boost to target location."
    },
    {
      "event_type": "needs_assessed",
      "agent_name": "NeedsAgent",
      "reasoning_text": "Extracted requirements: 45 stranded, medical need: high, requested: water, medical, rescue_boat."
    }
  ],
  "reallocation_diff": null
}
```

---

### 3.5 `POST /ml/initial-allocation`

Executed when a simulation session is initialized or started. Predicts baseline severity across all zones and solves global resource dispatch.

#### Request Schema
```json
{
  "scenario_id": "scn_pune_flood_01",
  "zones": [
    {
      "zone_id": 1,
      "name": "Zone A",
      "population_estimate": 15000,
      "severity_score": 0.70,
      "severity_level": "high",
      "disaster_type": "flood",
      "center_lat": 18.52,
      "center_lng": 73.85,
      "zone_needs": []
    }
  ],
  "helping_points": [
    {
      "point_id": 1,
      "name": "Central Depot",
      "lat": 18.51,
      "lng": 73.84,
      "status": "active",
      "inventory": [
        { "resource_id": 1, "resource_name": "water", "available_stock": 5000 },
        { "resource_id": 2, "resource_name": "food", "available_stock": 2000 }
      ]
    }
  ]
}
```

#### Response `200 OK`
```json
{
  "proposed_allocations": [
    {
      "zone_id": 1,
      "point_id": 1,
      "resource_id": 1,
      "quantity": 3750.0,
      "target_lat": 18.52,
      "target_lng": 73.85
    },
    {
      "zone_id": 1,
      "point_id": 1,
      "resource_id": 2,
      "quantity": 1500.0,
      "target_lat": 18.52,
      "target_lng": 73.85
    }
  ],
  "zone_needs_updates": [
    {
      "zone_id": 1,
      "resource_id": 1,
      "quantity_needed": 67500.0,
      "quantity_fulfilled": 0.0,
      "fulfillment_status": "shortage"
    },
    {
      "zone_id": 1,
      "resource_id": 2,
      "quantity_needed": 11250.0,
      "quantity_fulfilled": 0.0,
      "fulfillment_status": "shortage"
    }
  ],
  "severity_updates": [
    {
      "zone_id": 1,
      "severity_score": 0.732,
      "severity_level": "high"
    }
  ],
  "audit_entries": [
    {
      "event_type": "severity_assessed",
      "agent_name": "SeverityAgent",
      "reasoning_text": "Severity assessed for 1 zones. Zone 1: HIGH (0.73)"
    },
    {
      "event_type": "allocation_proposed",
      "agent_name": "CoordinatorAgent",
      "reasoning_text": "OR-Tools solver status: OPTIMAL. Proposed 2 allocations totaling 5250 resource units across 1 zones. Summary: requested=78750, allocated=5250, unmet=73500. Zones with unmet demand: 1."
    }
  ]
}
```

---

### 3.6 `POST /ml/tick`

Executed on temporal simulation tick (e.g., each virtual hour advancement) to re-evaluate conditions as disaster duration increases.

#### Request Schema
```json
{
  "scenario_id": "scn_pune_flood_01",
  "new_sim_time": "2026-09-12T16:00:00.000Z",
  "current_state": {
    "zones": [
      {
        "zone_id": 1,
        "population_estimate": 15000,
        "severity_score": 0.73,
        "severity_level": "high",
        "disaster_duration_hours": 3.0
      }
    ],
    "allocations": [],
    "inventory": []
  }
}
```

#### Response `200 OK`
```json
{
  "severity_updates": [
    {
      "zone_id": 1,
      "severity_score": 0.748,
      "severity_level": "high"
    }
  ],
  "new_allocations": [],
  "audit_entries": [
    {
      "event_type": "simulation_tick",
      "agent_name": "system",
      "reasoning_text": "Simulation advanced to 2026-09-12T16:00:00.000Z. Re-evaluated severity for 1 zones. Active allocations in pipeline: 0."
    }
  ]
}
```

---

## 4. Error Responses & Exception Handling

All validation and runtime errors return standard JSON payloads.

### 4.1 Schema Validation Error (`422 Unprocessable Entity`)
Occurs when unexpected keys, missing required fields, or values out of defined numerical ranges are provided.
```json
{
  "detail": "Unknown feature(s) rejected: ['unrecognized_field_name']"
}
```

### 4.2 Internal Solver / Inference Error (`500 Internal Server Error`)
```json
{
  "detail": "Report processing error: Solver failure during optimization."
}
```
*Note: The ML service logs full Python tracebacks to `stderr` for rapid container debugging.*
