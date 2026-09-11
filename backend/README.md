# RESQ — Backend Service & API Gateway

Node.js / Express backend responsible for data persistence, PostgreSQL connection pooling, WebSocket real-time event broadcasting, and coordination orchestration.

## Structure
- `src/`
  - `controllers/`: Route request handlers.
  - `routes/`: Express API route definitions.
  - `services/`: Database queries, client service logic, and FastAPI client integration.
  - `sockets/`: WebSocket event managers.
  - `index.js`: Application entry point.
