/**
 * app.js — Express application setup
 *
 * Configures middleware, mounts routes, and attaches the error handler.
 * Does NOT start the server — that's index.js.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Routes
const scenariosRouter    = require('./routes/scenarios');
const helpingPointsRouter = require('./routes/helpingPoints');
const zonesRouter        = require('./routes/zones');
const reportsRouter      = require('./routes/reports');
const allocationsRouter  = require('./routes/allocations');
const dashboardRouter    = require('./routes/dashboard');
const auditLogRouter     = require('./routes/auditLog');
const simulationRouter   = require('./routes/simulation');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');

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

module.exports = app;
