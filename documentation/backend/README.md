# Backend Architecture & API Documentation

This directory contains documentation for the RESQ backend services, including the Node.js API Gateway, PostgreSQL database integration, and communication with the ML/FastAPI agents.

## Scope & Contents
- **API Specifications**: REST endpoints for zones, helping points, reports, allocations, and logs.
- **WebSocket / Event Protocols**: Real-time event formats for dynamic reallocation diffs, conflict alerts, and status updates.
- **Database Architecture**: PostgreSQL schema definitions, migration guides, queries, and spatial indexing.
- **Inter-service Communication**: Protocols connecting the Node.js orchestrator with the FastAPI ML service.
