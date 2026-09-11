# RESQ — ML Libraries & Dependency Architecture

This document details every external library, package, and framework used within the **RESQ Machine Learning & Optimization Engine**, explaining its architectural role, key imported modules, justification, and operational configuration.

---

## 1. Requirements Overview

The complete Python dependency manifest is defined in `ml/requirements.txt`:

```text
pandas
numpy
scikit-learn
xgboost
joblib
pytest
fastapi
uvicorn
pydantic
httpx
ortools
```

---

## 2. Detailed Library Specifications

### 2.1 Google OR-Tools (`ortools`)
- **Category**: Operations Research & Mathematical Programming
- **Key Modules Imported**:
  ```python
  from ortools.linear_solver import pywraplp
  ```
- **Role in RESQ**: Powers the constrained resource allocation optimizer (`ml/src/allocation/optimizer.py`). Formulates and solves Mixed Integer Linear Programs (MILP) across multiple depots and disaster zones.
- **Why Chosen**:
  - Extremely fast C++ backend with lightweight Python bindings.
  - Native support for the **CBC (Coin-or branch and cut)** open-source mixed integer solver.
  - Graceful programmatic fallback to the **GLOP (Google Linear Optimization Package)** simplex solver when CBC is absent.
  - Handles anti-hoarding fraction constraints and non-linear distance decay coefficients easily.

---

### 2.2 XGBoost (`xgboost`)
- **Category**: Extreme Gradient Boosted Decision Trees
- **Key Modules Imported**:
  ```python
  import xgboost as xgb
  from xgboost import XGBRegressor
  ```
- **Role in RESQ**: Powers the core disaster severity scoring agent (`ml/src/predict.py`, `ml/src/train.py`).
- **Why Chosen**:
  - Superior tabular prediction accuracy and non-linear feature interaction modeling (e.g., compounding effect of high water level + blocked roads + medical shortages).
  - Fast single-tree inference latency ($< 5\text{ms}$).
  - Robust handling of collinearity among disaster telemetry features.
  - Native serialization and evaluation set monitoring during training.

---

### 2.3 Scikit-Learn (`scikit-learn`)
- **Category**: Machine Learning & Validation Utilities
- **Key Modules Imported**:
  ```python
  from sklearn.model_selection import train_test_split
  from sklearn.metrics import (
      mean_absolute_error,
      root_mean_squared_error,
      r2_score,
      classification_report,
      confusion_matrix
  )
  ```
- **Role in RESQ**:
  - Dataset splitting ($70\%$ train, $15\%$ validation, $15\%$ test) with reproducible random seeds.
  - Multi-metric model evaluation (MAE, RMSE, $R^2$).
  - Generation of 4-tier triage classification reports and confusion matrices.
- **Why Chosen**: De facto industry standard for ML evaluation metrics and reproducible dataset partitioning.

---

### 2.4 FastAPI (`fastapi`)
- **Category**: Asynchronous Modern Web API Framework
- **Key Modules Imported**:
  ```python
  from fastapi import FastAPI, HTTPException, status
  ```
- **Role in RESQ**: Serves the REST API for real-time inference, intelligence orchestration, simulation initial allocations, and Node.js gateway integration (`ml/service/main.py`).
- **Why Chosen**:
  - High throughput based on Starlette and Pydantic.
  - Native support for Python type annotations and asynchronous request handling.
  - Automatic OpenAPI / Swagger UI generation at `/docs`.
  - Seamless integration with Pydantic validation error handling.

---

### 2.5 Uvicorn (`uvicorn`)
- **Category**: Lightning-fast ASGI Server
- **Role in RESQ**: Production and development ASGI server executing the FastAPI application.
- **Why Chosen**: High-performance HTTP server built on `uvloop` and `httptools` capable of handling concurrent simulation requests from the Node.js backend.
- **Startup Configuration**:
  ```bash
  uvicorn ml.service.main:app --host 0.0.0.0 --port 8001 --reload
  ```

---

### 2.6 Pydantic (`pydantic`)
- **Category**: Data Parsing & Runtime Type Validation
- **Key Modules Imported**:
  ```python
  from pydantic import BaseModel, Field, model_validator
  ```
- **Role in RESQ**: Enforces strict schemas on all inputs to the ML service (`ml/service/schemas.py`, `ml/src/schemas.py`). Rejects unexpected fields and enforces numerical domain boundaries.
- **Why Chosen**: Zero-overhead validation, clear structured error messages (yielding HTTP 422), and seamless conversion to native Python dictionaries.

---

### 2.7 NumPy (`numpy`)
- **Category**: Vectorized Numerical Computation
- **Key Modules Imported**:
  ```python
  import numpy as np
  from numpy import polyfit, clip, arange
  ```
- **Role in RESQ**:
  - Powers polynomial regression (`np.polyfit(x, y, deg=1)`) for trend-aware demand forecasting (`ml/src/forecasting/baseline.py`).
  - Fast vector clipping (`np.clip(preds, 0.0, 1.0)`) and bounding operations.
  - Array manipulations for feature vectors and evaluation metrics.
- **Why Chosen**: Standard optimized C library for vectorized mathematical operations.

---

### 2.8 Pandas (`pandas`)
- **Category**: Tabular Data Analysis & Processing
- **Key Modules Imported**:
  ```python
  import pandas as pd
  ```
- **Role in RESQ**:
  - Ingestion, validation, and generation of the 10,000-row disaster dataset (`ml/data/raw/disaster_severity_dataset.csv`).
  - Formatting single-record DataFrames for XGBoost model inference ensuring strict column alignment.
- **Why Chosen**: Efficient DataFrame manipulation and CSV persistence.

---

### 2.9 Joblib (`joblib`)
- **Category**: Python Object Serialization
- **Key Modules Imported**:
  ```python
  import joblib
  ```
- **Role in RESQ**: Serializes trained XGBoost regressor models to disk (`ml/models/severity_xgboost.joblib`) and provides low-latency lazy loading in memory during inference.
- **Why Chosen**: Optimized for persisting large NumPy array structures and SciPy/XGBoost models much faster than standard `pickle`.

---

### 2.10 Pytest (`pytest`) & HTTPX (`httpx`)
- **Category**: Unit Testing & Asynchronous HTTP Client Testing
- **Key Modules Imported**:
  ```python
  import pytest
  import httpx
  from fastapi.testclient import TestClient
  ```
- **Role in RESQ**:
  - Powers the test suite across 7 dedicated test files in `ml/tests/`.
  - Provides in-memory HTTP client testing for all FastAPI endpoints without spinning up separate network processes.
- **Why Chosen**: Fast test execution, expressive assertions, and fixtures.

---

## 3. Environment Setup & Installation

### 3.1 Local Virtual Environment Setup
```bash
# 1. Navigate to repository root
cd RESQ-KurukuShetra

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# 4. Install dependencies
pip install -r ml/requirements.txt
```

### 3.2 Running the Test Suite
```bash
python -m pytest ml/tests/ -v
```

### 3.3 Running the ML Service
```bash
# Start ML Service on Port 8001
python -m uvicorn ml.service.main:app --host 0.0.0.0 --port 8001 --reload
```
