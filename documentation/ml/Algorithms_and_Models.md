# RESQ — Machine Learning Algorithms & Mathematical Formulations

This document provides a comprehensive mathematical and algorithmic breakdown of every model, heuristic, time-series forecaster, and optimization routine in the RESQ Machine Learning subsystem.

---

## Table of Contents
1. [Operational Feature Engineering & Normalization](#1-operational-feature-engineering--normalization)
2. [XGBoost Severity Regressor](#2-xgboost-severity-regressor)
3. [Deterministic Fallback Triage Engine](#3-deterministic-fallback-triage-engine)
4. [Trend-Aware Demand Forecasting](#4-trend-aware-demand-forecasting)
5. [Needs Assessment & Sphere Standards](#5-needs-assessment--sphere-standards)
6. [Constrained Multi-Resource Allocation Optimizer (MILP)](#6-constrained-multi-resource-allocation-optimizer-milp)
7. [NLP & SOS Entity Extraction](#7-nlp--sos-entity-extraction)

---

## 1. Operational Feature Engineering & Normalization

The feature builder (`ml/src/features/builder.py`) transforms unstructured operational payloads into a standardized 12-dimensional numerical vector $\mathbf{x} \in \mathbb{R}^{12}$.

### 1.1 Mathematical Definitions & Domain Ranges

$$\mathbf{x} = \begin{bmatrix} x_1, x_2, \dots, x_{12} \end{bmatrix}^T$$

| Index | Feature Name ($x_i$) | Physical Meaning | Valid Range $[\min, \max]$ | Default Value |
| :--- | :--- | :--- | :--- | :--- |
| $x_1$ | `affected_population` | Total vulnerable people in zone | $[0, 1\,000\,000]$ | $0.0$ |
| $x_2$ | `stranded_people` | Trapped citizens requiring extraction | $[0, 100\,000]$ | $0.0$ |
| $x_3$ | `water_level` | Normalized flood level score | $[0.0, 1.0]$ | $0.0$ |
| $x_4$ | `hospital_occupancy` | Zone medical load capacity ratio | $[0.0, 1.0]$ | $0.0$ |
| $x_5$ | `medical_cases` | Count of casualties / acute injuries | $[0, 50\,000]$ | $0.0$ |
| $x_6$ | `road_blocked` | Ingress/egress blockage flag ($\{0, 1\}$) | $[0.0, 1.0]$ | $0.0$ |
| $x_7$ | `sos_count` | Aggregated citizen distress reports | $[0, 10\,000]$ | $0.0$ |
| $x_8$ | `shelter_occupancy` | Relief camp capacity utilization | $[0.0, 1.0]$ | $0.0$ |
| $x_9$ | `food_shortage_ratio` | Unmet dietary nutritional deficit | $[0.0, 1.0]$ | $0.0$ |
| $x_{10}$ | `water_shortage_ratio` | Clean potable water deficit ratio | $[0.0, 1.0]$ | $0.0$ |
| $x_{11}$ | `disaster_duration_hours`| Elapsed duration of emergency | $[0.0, 720.0]$ | $0.0$ |
| $x_{12}$ | `population_vulnerability`| Vulnerability index | $[0.0, 1.0]$ | $0.0$ |

### 1.2 Boundary Clamping Policy
Every feature $x_i$ is clamped deterministically to prevent numerical explosion:

$$x_i^{\text{clamped}} = \max\left(\min(x_i, \max_i), \min_i\right)$$

---

## 2. XGBoost Severity Regressor

The disaster severity model (`ml/src/predict.py`, trained via `ml/src/train.py`) uses an ensemble of gradient-boosted decision trees to predict a continuous severity score $\hat{y} \in [0.0, 1.0]$.

### 2.1 Model Architecture & Loss Formulation

XGBoost minimizes the regularized objective function:

$$\mathcal{L}(\theta) = \sum_{i=1}^N l\left(y_i, \hat{y}_i\right) + \sum_{k=1}^K \Omega(f_k)$$

Where:
- $l(y_i, \hat{y}_i) = (y_i - \hat{y}_i)^2$ is the **mean squared error** objective (`reg:squarederror`).
- $\Omega(f_k) = \gamma T_k + \frac{1}{2}\lambda \sum_{j=1}^{T_k} w_{jk}^2$ is the tree complexity penalty ($T_k = \text{number of leaves}$, $w = \text{leaf weights}$).

### 2.2 Hyperparameters

```python
xgb.XGBRegressor(
    n_estimators=150,       # Number of boosting stages
    learning_rate=0.05,     # Shrinkage step size (eta)
    max_depth=5,            # Maximum tree depth for interactions
    subsample=0.8,          # Row subsampling ratio per tree
    colsample_bytree=0.8,   # Column subsampling ratio per tree
    random_state=42,        # Deterministic seed
    objective="reg:squarederror"
)
```

### 2.3 Post-Processing & Output Clamping
The raw regression output is clamped and rounded:

$$\hat{y}_{\text{score}} = \text{clip}\left(\hat{y}_{\text{raw}}, 0.0, 1.0\right)$$

### 2.4 Discrete Triage Level Mapping

$$\text{Severity Level}(\hat{y}) = \begin{cases} 
\text{LOW}, & 0.00 \le \hat{y} < 0.25 \\
\text{MODERATE}, & 0.25 \le \hat{y} < 0.50 \\
\text{HIGH}, & 0.50 \le \hat{y} < 0.75 \\
\text{CRITICAL}, & 0.75 \le \hat{y} \le 1.00 
\end{cases}$$

---

## 3. Deterministic Fallback Triage Engine

When the trained model artifact (`severity_xgboost.joblib`) is unavailable or fails to initialize, the system seamlessly transitions to a deterministic rule-based scoring engine (`ml/src/fallback.py`).

### 3.1 Linear Weighted Heuristic

$$\hat{y}_{\text{base}} = \sum_{k} w_k \cdot \phi_k(\mathbf{x})$$

Where individual feature components $\phi_k(\mathbf{x})$ and weights $w_k$ are:

| Component | Normalization Formula $\phi_k(\mathbf{x})$ | Weight $w_k$ |
| :--- | :--- | :--- |
| **Population** | $\min\left(1.0, \frac{\text{affected\_population}}{50\,000}\right)$ | $0.15$ |
| **Stranded** | $\min\left(1.0, \frac{\text{stranded\_people}}{5\,000}\right)$ | $0.20$ |
| **Water Level** | $\text{water\_level}$ | $0.15$ |
| **Hospital Load** | $\text{hospital\_occupancy}$ | $0.15$ |
| **Medical Cases** | $\min\left(1.0, \frac{\text{medical\_cases}}{2\,000}\right)$ | $0.15$ |
| **Road Block** | $\text{road\_blocked}$ | $0.10$ |
| **SOS Reports** | $\min\left(1.0, \frac{\text{sos\_count}}{50}\right)$ | $0.10$ |

$$\sum w_k = 0.15 + 0.20 + 0.15 + 0.15 + 0.15 + 0.10 + 0.10 = 1.00$$

### 3.2 Compound Stress Condition Boosts
To capture non-linear catastrophic interactions:

1. **Hospital Overload Crisis**:
   $$\text{If } (\text{hospital\_occupancy} > 0.85) \land (\text{medical\_cases} > 50) \implies \hat{y} \leftarrow \hat{y} + 0.10$$

2. **Isolation & Inundation Crisis**:
   $$\text{If } (\text{water\_level} > 0.70) \land (\text{road\_blocked} = 1.0) \implies \hat{y} \leftarrow \hat{y} + 0.10$$

---

## 4. Trend-Aware Demand Forecasting

The demand forecasting module (`ml/src/forecasting/baseline.py`) computes future resource needs over a forecast horizon $H \in \{1, 2, \dots, N\}$.

Given a historical demand sequence for resource $r$:

$$\mathbf{y} = [y_0, y_1, \dots, y_{n-1}]$$

### 4.1 Case 1: Persistence Model ($n = 1$)
$$\hat{y}_{n-1 + h} = y_0 \quad \forall h \in [1, H]$$

### 4.2 Case 2: Two-Point Extrapolation ($n = 2$)
$$\Delta = y_1 - y_0$$
$$\hat{y}_{n-1 + h} = \max\left(0, y_1 + \Delta \cdot h\right) \quad \forall h \in [1, H]$$

### 4.3 Case 3: Least-Squares Linear Trend ($n \ge 3$)
Fits an ordinary least-squares line $\hat{y}(t) = \beta_0 + \beta_1 t$ where $t \in \{0, 1, \dots, n-1\}$:

$$\beta_1 = \frac{\sum_{t=0}^{n-1} (t - \bar{t})(y_t - \bar{y})}{\sum_{t=0}^{n-1} (t - \bar{t})^2}, \quad \beta_0 = \bar{y} - \beta_1 \bar{t}$$

$$\hat{y}_{n-1 + h} = \max\left(0.0, \beta_0 + \beta_1 (n - 1 + h)\right) \quad \forall h \in [1, H]$$

---

## 5. Needs Assessment & Sphere Standards

The needs assessment engine (`ml/src/needs/assessment.py` & `ml/service/adapter.py`) calculates the exact shortage vector for a disaster zone.

### 5.1 Net Shortage Formulation

For each resource $r$ in zone $z$:

$$\text{Shortage}_{z,r} = \max\left(0.0, \text{TargetRequirement}_{z,r} - \text{ZoneInventory}_{z,r}\right)$$

### 5.2 Initial Needs Estimation (Sphere & WHO Standards)

When historical time-series data is not yet available, initial demand is synthesized using population, severity level multipliers, and disaster relevancy matrices:

$$\text{Estimated Demand}_{z,r} = \text{Population}_z \times \text{BaseRate}_r \times \text{SeverityMultiplier}(\text{level}_z) \times \text{RelevanceWeight}(\text{disaster\_type}, r)$$

#### 5.2.1 Base Per-Capita Rates (WHO / Sphere Handbook)
- **Water**: $3.0 \text{ liters/person/day}$ (WHO basic survival threshold)
- **Food**: $0.5 \text{ ration packets/person/day}$
- **Medical**: $0.02 \text{ kits/person/day}$ ($1 \text{ kit per } 50 \text{ people}$)
- **Rescue Team**: $0.001 \text{ teams/person}$ ($1 \text{ team per } 1\,000 \text{ people}$)
- **Ambulance**: $0.0005 \text{ vehicles/person}$ ($1 \text{ vehicle per } 2\,000 \text{ people}$)
- **Shelter**: $0.05 \text{ tents/person}$ ($1 \text{ tent per } 20 \text{ people}$)
- **Rescue Boat**: $0.0003 \text{ boats/person}$ ($1 \text{ boat per } 3\,333 \text{ people}$)

#### 5.2.2 Severity Multiplier
$$\text{Multiplier} = \begin{cases} 
0.5\times, & \text{LOW} \\
1.0\times, & \text{MODERATE} \\
1.5\times, & \text{HIGH} \\
2.5\times, & \text{CRITICAL} 
\end{cases}$$

#### 5.2.3 Disaster Relevancy Weight Matrix

| Resource | Flood | Earthquake | Fire | Cyclone |
| :--- | :--- | :--- | :--- | :--- |
| `water` | $1.0$ | $1.2$ | $1.5$ | $1.0$ |
| `food` | $1.0$ | $1.0$ | $0.8$ | $1.0$ |
| `medical` | $1.0$ | $1.5$ | $1.3$ | $1.0$ |
| `rescue_team` | $1.2$ | $1.5$ | $1.2$ | $1.0$ |
| `ambulance` | $0.8$ | $1.3$ | $1.5$ | $1.0$ |
| `shelter` | $1.2$ | $1.5$ | $1.0$ | $1.5$ |
| `rescue_boat` | $1.5$ | $0.0$ | $0.0$ | $0.8$ |

---

## 6. Constrained Multi-Resource Allocation Optimizer (MILP)

The resource allocation engine (`ml/src/allocation/optimizer.py`) is formulated as a **Mixed Integer Linear Program (MILP)** solved using **Google OR-Tools** (CBC Solver with GLOP fallback).

### 6.1 Sets, Indices & Parameters

- $\mathcal{Z}$: Set of disaster zones, indexed by $z$.
- $\mathcal{H}$: Set of helping points / supply depots, indexed by $h$.
- $\mathcal{R}$: Set of humanitarian resources, indexed by $r$.
- $S_{h,r} \ge 0$: Available inventory of resource $r$ at depot $h$.
- $D_{z,r} \ge 0$: Net shortage / demand of resource $r$ at zone $z$.
- $\text{sev}_z \in [0.01, 1.0]$: Evaluated severity score of zone $z$.
- $\sigma_z \in \{1.0, 2.5\}$: SOS priority boost multiplier ($\sigma_z = 2.5$ if zone is active SOS target).
- $d(z, h)$: Haversine distance in kilometers between zone $z$ and depot $h$.

### 6.2 Decision Variables

$$x_{z,h,r} \in \mathbb{Z}_{\ge 0} \quad \forall z \in \mathcal{Z}, \, h \in \mathcal{H}, \, r \in \mathcal{R}$$

Where $x_{z,h,r}$ is the integer quantity of resource $r$ dispatched from helping point $h$ to zone $z$.

### 6.3 Hard Operational Constraints

#### 1. Depot Supply Capacity Limit
Total dispatched quantity of resource $r$ from depot $h$ cannot exceed on-hand inventory:

$$\sum_{z \in \mathcal{Z}} x_{z,h,r} \le S_{h,r} \quad \forall h \in \mathcal{H}, \, r \in \mathcal{R}$$

#### 2. Zone Demand Satisfaction Limit
Total received quantity of resource $r$ in zone $z$ cannot exceed assessed need:

$$\sum_{h \in \mathcal{H}} x_{z,h,r} \le D_{z,r} \quad \forall z \in \mathcal{Z}, \, r \in \mathcal{R}$$

#### 3. Anti-Hoarding & Fair Regional Sharing Constraint
When multiple zones request resource $r$ from a single depot $h$, no single zone can consume the entire inventory:

$$x_{z,h,r} \le \alpha_z \cdot S_{h,r} \quad \forall z \in \mathcal{Z}_{\text{active}}, \, h \in \mathcal{H}, \, r \in \mathcal{R}$$

Where:
$$\alpha_z = \begin{cases} 0.90, & \text{if zone } z \text{ is an active SOS target} \\ 0.75, & \text{otherwise} \end{cases}$$

### 6.4 Haversine Distance & Decay Weighting

The great-circle distance $d(z, h)$ is computed via the Haversine formula:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_z) \cos(\phi_h) \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \arctan2\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d(z, h) = R_{\text{earth}} \cdot c \quad (R_{\text{earth}} = 6371.0 \text{ km})$$

Proximity decay weight:
$$w_{\text{dist}}(z, h) = \frac{1.0}{1.0 + 0.02 \cdot d(z, h)}$$

*(Reduces allocation preference by $\approx 2\%$ per kilometer of transit distance).*

### 6.5 Global Objective Function

$$\max \sum_{z \in \mathcal{Z}} \sum_{h \in \mathcal{H}} \sum_{r \in \mathcal{R}} \Big( \text{sev}_z \times \sigma_z \times w_{\text{dist}}(z, h) \Big) \cdot x_{z,h,r}$$

---

## 7. NLP & SOS Entity Extraction

The report parsing module (`ml/service/main.py::extract_report_entities`) processes raw citizen distress text messages.

### 7.1 Entity Classifiers
- **Incident Classification**: Regex & token matching (`flood`, `submerge`, `fire`, `earthquake`, `rubble`, `cyclone`, `trap`).
- **Casualty / Stranded Extraction**: Numerical regex extraction `\b(\d+)\b` filtered within realistic range $[1, 50\,000]$.
- **Medical Urgency**: Lexical matching (`critical`, `severe` $\to \text{high}$; `sick`, `injur` $\to \text{moderate}$; `minor`, `bruise` $\to \text{low}$).

### 7.2 Dynamic Emergency Need Injection
Extracted entities are converted directly into acute resource demands:
- $\text{Water} = 3.0 \times \text{stranded\_count}$
- $\text{Food} = 0.5 \times \text{stranded\_count}$
- $\text{Shelters} = \max(1.0, 0.05 \times \text{stranded\_count})$
- $\text{Rescue Teams} = \max(1.0, 0.01 \times \text{stranded\_count})$
- $\text{Medical Units} = 20 \text{ (if urgency is high)}$
- $\text{Ambulances} = 2 \text{ (if urgency is high)}$
