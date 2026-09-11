/**
 * zones.js — /api/scenarios/:scenarioId/zones routes (Prisma ORM)
 */

import express from 'express';
import prisma from '../config/prisma.js';
import { createError } from '../middleware/errorHandler.js';
import { broadcastToScenario } from '../ws/socketManager.js';

const router = express.Router({ mergeParams: true });

const SEVERITY_LEVELS = ['low', 'moderate', 'high', 'critical'];

const INCLUDE_NEEDS = {
  zone_needs: {
    include: { resource_type: true },
    orderBy: { resource_type: { name: 'asc' } },
  },
};

const formatZone = (z) => ({
  ...z,
  needs: (z.zone_needs || []).map((n) => ({
    resource_id:        n.resource_id,
    resource_name:      n.resource_type.name,
    unit:               n.resource_type.unit,
    quantity_needed:    n.quantity_needed,
    quantity_fulfilled: n.quantity_fulfilled,
    fulfillment_status: n.fulfillment_status,
  })),
  zone_needs: undefined,
});

// ── POST /api/scenarios/:scenarioId/zones ───────────────────
router.post('/', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { name, center_lat, center_lng, radius_m, disaster_type = 'flood', severity_level = 'low', severity_score = 0.0, population_estimate = 0 } = req.body;

    if (!name || center_lat == null || center_lng == null || radius_m == null) {
      throw createError(400, 'VALIDATION_ERROR', 'name, center_lat, center_lng, and radius_m are required');
    }
    if (!SEVERITY_LEVELS.includes(severity_level)) {
      throw createError(400, 'VALIDATION_ERROR', `severity_level must be one of: ${SEVERITY_LEVELS.join(', ')}`);
    }

    // Validate scenario exists
    const scenario = await prisma.scenario.findUnique({ where: { scenario_id: scenarioId } });
    if (!scenario) {
      throw createError(404, 'NOT_FOUND', `Scenario "${scenarioId}" not found`);
    }

    const zone = await prisma.zone.create({
      data: { scenario_id: scenarioId, name, center_lat, center_lng, radius_m, disaster_type, severity_level, severity_score, population_estimate },
      include: INCLUDE_NEEDS,
    });

    await prisma.auditLog.create({
      data: {
        scenario_id: scenarioId,
        event_type: 'zone_created',
        agent_name: 'system',
        zone_id: zone.zone_id,
        reasoning_text: `Zone "${name}" created with severity: ${severity_level}`,
      },
    });

    const formatted = formatZone(zone);
    broadcastToScenario(scenarioId, 'zone.created', formatted);
    res.status(201).json(formatted);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/scenarios/:scenarioId/zones ─────────────────────
router.get('/', async (req, res, next) => {
  try {
    const zones = await prisma.zone.findMany({
      where: { scenario_id: req.params.scenarioId },
      include: INCLUDE_NEEDS,
      orderBy: [{ severity_score: 'desc' }, { zone_id: 'asc' }],
    });
    res.json(zones.map(formatZone));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/scenarios/:scenarioId/zones/:zoneId ─────────────
router.get('/:zoneId', async (req, res, next) => {
  try {
    const zone = await prisma.zone.findFirst({
      where: { zone_id: parseInt(req.params.zoneId), scenario_id: req.params.scenarioId },
      include: INCLUDE_NEEDS,
    });
    if (!zone) throw createError(404, 'NOT_FOUND', `Zone ${req.params.zoneId} not found`);
    res.json(formatZone(zone));
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/scenarios/:scenarioId/zones/:zoneId ──────────
router.patch('/:zoneId', async (req, res, next) => {
  try {
    const { scenarioId, zoneId } = req.params;
    const { severity_score, severity_level, status, population_estimate, name } = req.body;

    if (severity_level && !SEVERITY_LEVELS.includes(severity_level)) {
      throw createError(400, 'VALIDATION_ERROR', `severity_level must be one of: ${SEVERITY_LEVELS.join(', ')}`);
    }

    const zone = await prisma.zone.update({
      where: { zone_id: parseInt(zoneId) },
      data: {
        ...(name !== undefined             && { name }),
        ...(severity_score !== undefined   && { severity_score }),
        ...(severity_level                 && { severity_level }),
        ...(status                         && { status }),
        ...(population_estimate !== undefined && { population_estimate }),
        updated_at: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        scenario_id: scenarioId,
        event_type: 'zone_severity_updated',
        agent_name: 'system',
        zone_id: parseInt(zoneId),
        reasoning_text: `Zone ${zoneId} updated — severity: ${zone.severity_level}, score: ${zone.severity_score}`,
      },
    });

    broadcastToScenario(scenarioId, 'zone.updated', zone);
    res.json(zone);
  } catch (err) {
    if (err.code === 'P2025') return next(createError(404, 'NOT_FOUND', `Zone ${req.params.zoneId} not found`));
    next(err);
  }
});

// ── DELETE /api/scenarios/:scenarioId/zones/:zoneId ──────────
router.delete('/:zoneId', async (req, res, next) => {
  try {
    const { scenarioId, zoneId } = req.params;
    await prisma.zone.delete({ where: { zone_id: parseInt(zoneId) } });
    broadcastToScenario(scenarioId, 'zone.deleted', { zone_id: parseInt(zoneId) });
    res.json({ message: `Zone ${zoneId} deleted` });
  } catch (err) {
    if (err.code === 'P2025') return next(createError(404, 'NOT_FOUND', `Zone ${req.params.zoneId} not found`));
    next(err);
  }
});

export default router;
