/**
 * scenarios.js — /api/scenarios routes (Prisma ORM)
 *
 * POST   /api/scenarios        → Create new simulation session
 * GET    /api/scenarios        → List all scenarios
 * GET    /api/scenarios/:id    → Get scenario with summary stats
 * PATCH  /api/scenarios/:id    → Update scenario
 * DELETE /api/scenarios/:id    → Delete a scenario
 */

const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { createError } = require('../middleware/errorHandler');
const { broadcastToScenario, broadcast } = require('../ws/socketManager');

// ── POST /api/scenarios ──────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { name, description, disaster_type = 'flood' } = req.body;
    if (!name) throw createError(400, 'VALIDATION_ERROR', 'Scenario name is required');

    const scenario_id = `scn_${uuidv4().split('-')[0]}`;

    const scenario = await prisma.scenario.create({
      data: { scenario_id, name, description, disaster_type },
    });

    broadcast('scenario.created', scenario);
    res.status(201).json(scenario);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/scenarios ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const scenarios = await prisma.scenario.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(scenarios);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/scenarios/:id ───────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const scenario = await prisma.scenario.findUnique({
      where: { scenario_id: req.params.id },
    });
    if (!scenario) throw createError(404, 'NOT_FOUND', `Scenario "${req.params.id}" not found`);

    // Aggregate stats
    const [totalZones, criticalZones, affectedPop, activeReports, totalAllocations, pendingApprovals] =
      await Promise.all([
        prisma.zone.count({ where: { scenario_id: req.params.id } }),
        prisma.zone.count({ where: { scenario_id: req.params.id, severity_level: 'critical' } }),
        prisma.zone.aggregate({ where: { scenario_id: req.params.id }, _sum: { population_estimate: true } }),
        prisma.report.count({ where: { scenario_id: req.params.id, NOT: { verification_status: 'rejected' } } }),
        prisma.allocation.count({ where: { scenario_id: req.params.id } }),
        prisma.allocation.count({ where: { scenario_id: req.params.id, status: 'proposed' } }),
      ]);

    res.json({
      ...scenario,
      stats: {
        total_zones: totalZones,
        critical_zones: criticalZones,
        affected_population: affectedPop._sum.population_estimate ?? 0,
        active_reports: activeReports,
        total_allocations: totalAllocations,
        pending_approvals: pendingApprovals,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/scenarios/:id ─────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, description, status, disaster_type } = req.body;
    const validStatuses = ['setup', 'running', 'paused', 'completed'];
    if (status && !validStatuses.includes(status)) {
      throw createError(400, 'VALIDATION_ERROR', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const scenario = await prisma.scenario.update({
      where: { scenario_id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(disaster_type && { disaster_type }),
        updated_at: new Date(),
      },
    });

    broadcastToScenario(req.params.id, 'scenario.updated', scenario);
    res.json(scenario);
  } catch (err) {
    if (err.code === 'P2025') return next(createError(404, 'NOT_FOUND', `Scenario "${req.params.id}" not found`));
    next(err);
  }
});

// ── DELETE /api/scenarios/:id ────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.scenario.delete({ where: { scenario_id: req.params.id } });
    broadcast('scenario.deleted', { scenario_id: req.params.id });
    res.json({ message: `Scenario "${req.params.id}" deleted` });
  } catch (err) {
    if (err.code === 'P2025') return next(createError(404, 'NOT_FOUND', `Scenario "${req.params.id}" not found`));
    next(err);
  }
});

module.exports = router;
