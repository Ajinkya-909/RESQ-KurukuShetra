/**
 * app.js — Express application setup
 *
 * Configures middleware, mounts routes, and attaches the error handler.
 * Does NOT start the server — that's index.js.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Routes
import scenariosRouter from './routes/scenarios.js';
import helpingPointsRouter from './routes/helpingPoints.js';
import zonesRouter from './routes/zones.js';
import reportsRouter from './routes/reports.js';
import allocationsRouter from './routes/allocations.js';
import dashboardRouter from './routes/dashboard.js';
import auditLogRouter from './routes/auditLog.js';
import simulationRouter from './routes/simulation.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.url}`);
    next();
  });
}

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'RESQ Node.js Gateway',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/scenarios',                scenariosRouter);
app.use('/api/helping-points',           helpingPointsRouter);
app.use('/api/scenarios/:scenarioId/zones',        zonesRouter);
app.use('/api/scenarios/:scenarioId/reports',      reportsRouter);
app.use('/api/scenarios/:scenarioId/allocations',  allocationsRouter);
app.use('/api/scenarios/:scenarioId/dashboard',    dashboardRouter);
app.use('/api/scenarios/:scenarioId/audit-log',    auditLogRouter);
app.use('/api/scenarios/:scenarioId/simulation',   simulationRouter);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found. Check the API Specification for valid endpoints.',
    },
  });
});

// ── Centralized Error Handler ────────────────────────────────
app.use(errorHandler);

export default app;
