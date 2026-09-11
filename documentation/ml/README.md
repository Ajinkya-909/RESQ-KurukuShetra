# RESQ — Machine Learning & Optimization Engine Documentation

Welcome to the comprehensive technical documentation for the **RESQ Machine Learning & Optimization Subsystem**.

The RESQ ML engine is a high-performance, asynchronous intelligence pipeline written in Python (FastAPI) that integrates tree-based machine learning (XGBoost), mathematical optimization (Google OR-Tools MILP), time-series trend forecasting, and humanitarian heuristic engines to power real-time disaster triage, needs assessment, and automated resource dispatch.

---

## Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             RESQ Node.js API Gateway                             │
│                  (PostgreSQL / Prisma / Socket.io / mlClient.js)                 │
└───────────────┬───────────────────────────┬──────────────────────────┬───────────┘
                │                           │                          │
        POST /ml/process-report     POST /ml/initial-alloc      POST /ml/tick
                │                           │                          │
                ▼                           ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         Python FastAPI ML Service (:8001)                        │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │               1. Operational Payload Feature Builder & NLP               │   │
│   │           (12 Operational Features + Entity Extraction + Provenance)     │   │
│   └─────────────────────────────────────┬────────────────────────────────────┘   │
│                                         ▼                                        │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                  2. Disaster Severity Scoring Engine                     │   │
│   │           (XGBoost Regressor + Deterministic Fallback Heuristics)        │   │
│   └─────────────────────────────────────┬────────────────────────────────────┘   │
│                                         ▼                                        │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                   3. Demand Forecasting Baseline                         │   │
│   │           (Multi-step Linear Trend & Persistence Extrapolation)          │   │
│   └─────────────────────────────────────┬────────────────────────────────────┘   │
│                                         ▼                                        │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                   4. Needs Assessment & Shortage Engine                  │   │
│   │           (Per-Capita Sphere/WHO Rates + Net Inventory Deficit)          │   │
│   └─────────────────────────────────────┬────────────────────────────────────┘   │
│                                         ▼                                        │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │             5. Constrained Resource Allocation Optimizer                 │   │
│   │       (Google OR-Tools Mixed Integer Linear Programming - CBC/GLOP)      │   │
│   └─────────────────────────────────────┬────────────────────────────────────┘   │
│                                         │                                        │
│                                         ▼                                        │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                       6. Result Serialization & Audit                    │   │
│   │            (DB Mapping + Priority Preemption Trails + Multi-Zone Diff)   │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Documentation Index

The ML documentation suite is structured into dedicated, deep-dive specifications:

| Document | Description |
| :--- | :--- |
| 📖 [**API Specification**](./API_Specification.md) | Complete REST API endpoint reference, Pydantic schemas, payload structures, HTTP status codes, and Node.js gateway integration contracts. |
| 🔬 [**Algorithms & Models**](./Algorithms_and_Models.md) | Mathematical formulas, loss functions, optimization models, XGBoost hyperparameters, fallback logic, forecasting math, and humanitarian heuristic models. |
| 📦 [**Libraries & Dependencies**](./Libraries_and_Dependencies.md) | Comprehensive breakdown of all Python packages (`xgboost`, `ortools`, `fastapi`, `pydantic`, `scikit-learn`, `pandas`, `numpy`, etc.), their roles, and setup. |
| 🔄 [**Pipeline & Workflows**](./Pipeline_and_Workflow.md) | End-to-end execution workflows for unified intelligence analysis, simulation startup, emergency SOS report triage, and temporal tick re-evaluation. |

---

## Core Capabilities at a Glance

### 1. Disaster Severity Scoring
- **Primary Model**: 12-feature XGBoost Regressor trained on synthetic disaster scenarios evaluating casualties, water levels, road blockages, medical stress, and population vulnerability.
- **Continuous & Discrete Output**: Yields a normalized continuous score in $[0.0, 1.0]$ mapped to discrete operational triage tiers: `LOW`, `MODERATE`, `HIGH`, and `CRITICAL`.
- **High-Reliability Fallback**: Automatic, zero-downtime fallback to deterministic multi-factor heuristics if model artifacts are unavailable.

### 2. Time-Series Demand Forecasting
- **Linear Trend Extrapolation**: Polynomial least-squares regression over historical demand series ($N \ge 3$) with non-negative lower bounding.
- **Dynamic Horizons**: Supports single-step and multi-hour lookahead projections ($1$ to $N$ hours) for critical supplies (water, food, medical kits).

### 3. Sphere/WHO-Compliant Needs Assessment
- **Humanitarian Standards**: Implements per-capita daily consumption rates (e.g., 3.0 L drinking water, 0.5 ration kits, medical kits, rescue teams).
- **Disaster Relevancy Matrix**: Calibrates resource requirements dynamically based on disaster type (`flood`, `earthquake`, `fire`, `cyclone`).
- **Net Inventory Shortage**: Calculates true deficit $\max(0, \text{Requirement} - \text{Zone Inventory})$.

### 4. Mathematical Resource Allocation Optimization
- **MILP Formulation**: Solved via **Google OR-Tools** (CBC Mixed Integer Programming solver with GLOP linear fallback).
- **Objective Function**: Maximizes triage impact weighted by zone severity, SOS emergency priority multipliers ($2.5\times$), and Haversine geospatial distance decay.
- **Hard Operational Constraints**:
  - *Supply Capacities*: Cannot exceed physical depot inventory.
  - *Demand Ceilings*: Prevents over-allocating beyond calculated zone shortages.
  - *Anti-Hoarding Safeguards*: Prevents a single zone from exhausting regional depots ($75\%$ cap for standard zones, $90\%$ for active SOS targets).

### 5. Automated Audit & Provenance
- Generates structured, explainable reasoning trails for every decision (`SeverityAgent`, `NeedsAgent`, `CoordinatorAgent`, `VerificationAgent`).
- Full provenance tracking showing exact source variables, intermediate calculations, and defaulted parameters.

---

## Directory Structure

```text
ml/
├── data/
│   └── raw/
│       └── disaster_severity_dataset.csv     # 10,000 reproducible training samples
├── models/
│   ├── severity_xgboost.joblib              # Serialized XGBoost model artifact
│   └── severity_xgboost_metadata.json       # Training metadata, metrics (MAE/RMSE/R²), feature importances
├── service/
│   ├── __init__.py
│   ├── main.py                              # FastAPI REST service & Node integration endpoints (:8001)
│   ├── schemas.py                           # Service Pydantic request/response models
│   └── adapter.py                           # Data transformation & humanitarian heuristics layer
├── src/
│   ├── __init__.py
│   ├── schemas.py                           # Single source of truth for 12 operational features & ranges
│   ├── generate_data.py                     # Synthetic dataset generation pipeline
│   ├── fallback.py                          # Rule-based fallback triage engine
│   ├── train.py                             # XGBoost training, evaluation, & serialization script
│   ├── predict.py                           # Reusable model inference module with auto-fallback
│   ├── features/
│   │   ├── __init__.py
│   │   └── builder.py                       # Operational payload feature builder with provenance
│   ├── forecasting/
│   │   ├── __init__.py
│   │   ├── schemas.py                       # Forecasting input validation
│   │   └── baseline.py                      # Trend-aware demand forecasting baseline
│   ├── needs/
│   │   ├── __init__.py
│   │   ├── schemas.py                       # Needs assessment input validation
│   │   └── assessment.py                    # Net shortage calculation engine
│   ├── allocation/
│   │   ├── __init__.py
│   │   ├── schemas.py                       # Allocation input validation
│   │   └── optimizer.py                     # Google OR-Tools MILP resource allocation solver
│   └── pipeline/
│       ├── __init__.py
│       ├── schemas.py                       # Unified pipeline validation
│       └── intelligence.py                  # End-to-end intelligence orchestrator
├── tests/
│   ├── test_severity_agent.py               # Unit & edge case tests for severity models
│   ├── test_service.py                      # FastAPI endpoint integration tests
│   ├── test_feature_builder.py              # Feature extraction & validation tests
│   ├── test_forecasting.py                  # Demand forecasting tests
│   ├── test_needs_assessment.py             # Shortage calculation tests
│   ├── test_allocation.py                   # OR-Tools optimizer & constraint tests
│   └── test_intelligence_pipeline.py        # End-to-end pipeline integration tests
├── requirements.txt                         # Python dependencies
└── README.md                                # Developer quickstart guide
```

---

## Quick Reference Links
- [REST API Specification](./API_Specification.md)
- [Algorithms & Mathematical Models](./Algorithms_and_Models.md)
- [Libraries & Dependencies Guide](./Libraries_and_Dependencies.md)
- [Pipeline & Workflow Architecture](./Pipeline_and_Workflow.md)
