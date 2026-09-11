# RESQ Machine Learning Service — Phase 6: Unified Intelligence Pipeline

This repository houses the **RESQ Machine Learning Engine**, including XGBoost Severity Scoring, FastAPI REST service, Operational Feature Builder, Demand Forecasting Baseline, Needs Assessment Engine, OR-Tools Resource Allocation Optimizer, and **Unified Intelligence Pipeline**.

---

## 1. Architecture Flow
```text
┌─────────────────────────┐
│ RESQ Operational State  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Operational Feature     │ (ml/src/features/builder.py)
│ Builder                 │
└────────────┬────────────┘
             │ (12 Model Features)
             ▼
┌─────────────────────────┐
│ XGBoost Severity Model  │ (ml/src/predict.py)
└────────────┬────────────┘
             │ (Severity Score & Level)
             ▼
┌─────────────────────────┐
│ Demand Forecasting      │ (ml/src/forecasting/baseline.py)
│ Baseline                │
└────────────┬────────────┘
             │ (Forecast Demand Series)
             ▼
┌─────────────────────────┐
│ Needs Assessment Engine │ (ml/src/needs/assessment.py)
│ (Shortage Calculation)  │
└────────────┬────────────┘
             │ (Zone Shortages / Needs)
             ▼
┌─────────────────────────┐
│ OR-Tools Resource       │ (ml/src/allocation/optimizer.py)
│ Allocation Optimizer    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Final Unified           │
│ Intelligence Result     │
└─────────────────────────┘
```

---

## 2. Unified ML Intelligence Pipeline (Phase 6)

The **Unified Intelligence Pipeline** (`ml/src/pipeline/intelligence.py`) orchestrates the complete end-to-end intelligence cycle without duplicating any underlying model logic:

1. **Observe & Extract Features:** `build_features_from_payload()` converts raw state payloads into the 12 model features.
2. **Predict Severity:** `predict_severity()` computes XGBoost continuous `severity_score` and discrete `severity_level`.
3. **Forecast Demand:** `forecast_demand()` extrapolates historical series into an $N$-hour trend requirement.
4. **Assess Shortages:** `assess_needs()` calculates exact net shortages (`forecast_requirement - zone_inventory`).
5. **Optimize Allocation:** `optimize_allocations()` solves MILP via Google OR-Tools to dispatch available stock from helping points to satisfy shortages.

---

### 2.1 Distinction Between Pipeline Concepts

- **Prediction:** Continuous XGBoost score ($0.0 - 1.0$) and triage level (`CRITICAL`, `HIGH`, etc.) for zone urgency.
- **Forecast:** Estimated physical resource demand curve over the next $1-3$ hours based on historical trends.
- **Need:** Physical resource shortage after subtracting local `zone_inventory` from the target forecast requirement.
- **Allocation:** Feasible, priority-weighted dispatch plan of stock from external `helping_points` to cover zone needs.

---

### 2.2 Python Usage Example

```python
from ml.src.pipeline import run_intelligence_pipeline

payload = {
    "zone": {
        "zone_id": "ZONE-FLOOD-C",
        "population_estimate": 15000,
        "disaster_duration_hours": 18,
        "population_vulnerability": 0.80
    },
    "reports": [
        {"stranded_people": 300, "medical_cases": 150, "severity_signal": 0.95},
        {"stranded_people": 150, "medical_cases": 100, "severity_signal": 0.90}
    ],
    "operational_state": {
        "water_level": 0.92,
        "hospital_occupancy": 0.98,
        "shelter_occupancy": 0.85,
        "road_blocked": True,
        "food_shortage_ratio": 0.60,
        "water_shortage_ratio": 0.70
    },
    "historical_demand": {
        "water": [400, 450, 500, 550, 600, 650],
        "food": [250, 280, 300, 330, 360, 390],
        "medical_kits": [50, 55, 60, 70, 75, 80]
    },
    "zone_inventory": {
        "water": 300,
        "food": 150,
        "medical_kits": 50
    },
    "helping_points": [
        {
            "helping_point_id": "HP-DEPOT-ALPHA",
            "inventory": {"water": 400, "food": 200, "medical_kits": 50}
        },
        {
            "helping_point_id": "HP-DEPOT-BETA",
            "inventory": {"water": 300, "food": 300, "medical_kits": 50}
        }
    ]
}

# Run end-to-end intelligence pipeline
result = run_intelligence_pipeline(payload, horizon=3, include_provenance=True)

print(result["severity"])   # {'score': 0.89, 'level': 'CRITICAL', 'model': 'xgboost'}
print(result["needs"])      # {'water': 520.48, 'food': 261.38, 'medical_kits': 23.85}
print(result["allocation"]) # {'status': 'OPTIMAL', 'summary': ..., 'allocations': [...]}
```

---

## 3. Directory Layout
```text
ml/
├── data/
│   └── raw/
│       └── disaster_severity_dataset.csv     # 10,000 reproducible samples
├── models/
│   ├── severity_xgboost.joblib              # Serialized XGBoost model
│   └── severity_xgboost_metadata.json       # Metadata & metrics
├── service/
│   ├── __init__.py
│   └── main.py                              # FastAPI application server (Port 8001)
├── src/
│   ├── __init__.py
│   ├── schemas.py                            # Single source of truth for features & validation
│   ├── generate_data.py                      # Synthetic dataset generator script
│   ├── fallback.py                           # Rule-based fallback engine
│   ├── train.py                              # XGBoost model trainer & evaluator
│   ├── predict.py                            # Reusable inference module
│   ├── features/
│   │   ├── __init__.py
│   │   └── builder.py                        # Operational payload feature builder
│   ├── forecasting/
│   │   ├── __init__.py
│   │   ├── schemas.py                        # Forecasting input validation
│   │   └── baseline.py                       # Trend-aware demand forecasting baseline
│   ├── needs/
│   │   ├── __init__.py
│   │   ├── schemas.py                        # Needs assessment input validation
│   │   └── assessment.py                     # Shortage calculation engine
│   ├── allocation/
│   │   ├── __init__.py
│   │   ├── schemas.py                        # Allocation input validation
│   │   └── optimizer.py                      # OR-Tools resource allocation solver
│   └── pipeline/
│       ├── __init__.py
│       ├── schemas.py                        # Pipeline input validation
│       └── intelligence.py                   # Unified intelligence pipeline orchestrator
├── tests/
│   ├── test_severity_agent.py               # Phase 1 unit & scenario tests
│   ├── test_service.py                      # Phase 2 FastAPI endpoint tests
│   ├── test_feature_builder.py              # Phase 3 feature builder tests
│   ├── test_forecasting.py                  # Phase 4A demand forecasting tests
│   ├── test_needs_assessment.py             # Phase 5A needs assessment tests
│   ├── test_allocation.py                   # Phase 5B OR-Tools optimizer tests
│   └── test_intelligence_pipeline.py        # Phase 6 pipeline integration tests
├── requirements.txt
└── README.md
```

---

## 4. Running Tests
Run all pytest test suites:

```bash
python -m pytest ml/tests/ -v
```
