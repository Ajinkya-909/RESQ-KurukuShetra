# RESQ — Machine Learning & Multi-Agent Service

Python FastAPI service housing the core multi-agent intelligence, NLP pipelines, triage scoring, and optimization heuristics for emergency resource allocation.

## Structure
- `app/`
  - `agents/`: Needs assessment, priority scoring, allocation optimizer, duplicate conflict detector.
  - `models/`: Pydantic data schemas for agent inputs and outputs.
  - `core/`: Optimization and math logic (Haversine distance, greedy matching).
  - `main.py`: FastAPI server entrypoint.
