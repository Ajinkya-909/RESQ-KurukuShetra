# RESQ Documentation Hub

Welcome to the central documentation index for the **RESQ** autonomous disaster relief and emergency coordination platform.

---

## Subsystem Documentation

| Subsystem | Documentation Directory | Scope & Contents |
| :--- | :--- | :--- |
| **Machine Learning & Optimization** | [📖 `documentation/ml/`](./ml/README.md) | Full FastAPI REST API specifications, mathematical models (XGBoost Regressor, OR-Tools MILP, Polynomial Demand Forecasting, Sphere/WHO Needs Assessment), library breakdowns, and end-to-end workflow lifecycles. |
| **Backend & Orchestration** | [📖 `documentation/backend/`](./backend/README.md) | Express Gateway REST endpoints, WebSocket event protocols, PostgreSQL relational schema, inter-service contracts, and database migration notes. |
| **Frontend & Visualization** | [📖 `documentation/frontend/`](./frontend/README.md) | React command dashboard, interactive Leaflet mapping, real-time before/after allocation diffs, state machines, and design systems. |
| **Product & System Requirements** | [📖 `documentation/PRD.md`](./PRD.md) | Problem statement (PS20), core user journeys, agent ecosystem definitions, edge cases, and product milestones. |
| **Database SQL Schema** | [📖 `documentation/disaster_relief_schema.sql`](./disaster_relief_schema.sql) | Master PostgreSQL table definitions, spatial indices, constraints, and audit logging triggers. |

---

## ML Subsystem Quick Links
- [ML API Specification (Endpoints, Schemas, Status Codes)](./ml/API_Specification.md)
- [Algorithms, Mathematical Models & Heuristics](./ml/Algorithms_and_Models.md)
- [Python Libraries & Dependency Architecture](./ml/Libraries_and_Dependencies.md)
- [ML Pipeline Architecture & Workflows](./ml/Pipeline_and_Workflow.md)
