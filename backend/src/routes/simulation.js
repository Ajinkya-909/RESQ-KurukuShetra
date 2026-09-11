/**
 * simulation.js — /api/scenarios/:scenarioId/simulation routes (Prisma ORM)
 */

import express from 'express';
import prisma from '../config/prisma.js';
import { createError } from '../middleware/errorHandler.js';
import { broadcastToScenario } from '../ws/socketManager.js';
import mlClient from '../services/mlClient.js';

const router = express.Router({ mergeParams: true });

// ── POST .../simulation/start ────────────────────────────────
router.post('/start', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { zones = [] } = req.body;

    const scenario = await prisma.scenario.findUnique({ where: { scenario_id: scenarioId } });
    if (!scenario) throw createError(404, 'NOT_FOUND', `Scenario "${scenarioId}" not found`);
    if (scenario.status !== 'setup') throw createError(409, 'CONFLICT', `Cannot start: scenario is already "${scenario.status}"`);

    // Bulk create zones
    let createdZones = [];
    if (zones.length > 0) {
      await prisma.zone.createMany({
        data: zones.map((z) => ({
          scenario_id: scenarioId,
          name: z.name, center_lat: z.center_lat, center_lng: z.center_lng,
          radius_m: z.radius_m, disaster_type: z.disaster_type || 'flood',
          severity_level: z.severity_level || 'low',
          severity_score: z.severity_score || 0.0,
          population_estimate: z.population_estimate || 0,
        })),
      });
      createdZones = await prisma.zone.findMany({ where: { scenario_id: scenarioId } });
    }

    const updated = await prisma.scenario.update({
      where: { scenario_id: scenarioId },
      data: { status: 'running', updated_at: new Date() },
    });

    await prisma.auditLog.create({
      data: { scenario_id: scenarioId, event_type: 'scenario_started', agent_name: 'system', reasoning_text: `Simulation started with ${createdZones.length} zones.` },
    });

    // Fire-and-forget initial ML allocation
    const helpingPoints = await prisma.helpingPoint.findMany({ where: { status: 'active' }, include: { inventory: true } });
    mlClient.initialAllocation(scenarioId, createdZones, helpingPoints).then(async (mlResult) => {
      for (const entry of mlResult.audit_entries || []) {
        await prisma.auditLog.create({ data: { scenario_id: scenarioId, event_type: entry.event_type, agent_name: entry.agent_name, reasoning_text: entry.reasoning_text } });
      }
      broadcastToScenario(scenarioId, 'simulation.started', { scenario_id: scenarioId, zones_created: createdZones.length, sim_time: updated.sim_time });
    }).catch((err) => console.error('❌ [Sim] Initial allocation failed:', err.message));

    res.json({ scenario_id: scenarioId, status: 'running', zones_created: createdZones.length, message: 'Simulation started.' });
  } catch (err) {
    next(err);
  }
});

// ── POST .../simulation/tick ─────────────────────────────────
router.post('/tick', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { advance_hours = 1 } = req.body;

    const scenario = await prisma.scenario.findUnique({ where: { scenario_id: scenarioId } });
    if (!scenario) throw createError(404, 'NOT_FOUND', `Scenario "${scenarioId}" not found`);
    if (scenario.status !== 'running') throw createError(409, 'CONFLICT', `Cannot tick: scenario is "${scenario.status}"`);

    const newSimTime = new Date(scenario.sim_time.getTime() + advance_hours * 60 * 60 * 1000);
    const tickEvents = [];

    await prisma.$transaction(async (tx) => {
      // Advance clock
      await tx.scenario.update({ where: { scenario_id: scenarioId }, data: { sim_time: newSimTime, updated_at: new Date() } });

      // Replenish inventory
      const inventoryRows = await tx.helpingPointInventory.findMany({ where: { replenish_rate: { gt: 0 } } });
      for (const row of inventoryRows) {
        const replenish = row.replenish_rate * advance_hours;
        const newAvail = Math.min(row.max_capacity, row.available_stock + replenish);
        await tx.helpingPointInventory.update({
          where: { id: row.id },
          data: { available_stock: newAvail, total_stock: newAvail + row.reserved_stock + row.in_transit },
        });
      }
      if (inventoryRows.length) tickEvents.push(`Inventory replenished at ${inventoryRows.length} rows`);

      // Auto-deliver en_route allocations past ETA
      const delivered = await tx.allocation.findMany({
        where: { scenario_id: scenarioId, status: 'en_route', eta: { lte: newSimTime } },
      });
      if (delivered.length > 0) {
        await tx.allocation.updateMany({
          where: { allocation_id: { in: delivered.map((d) => d.allocation_id) } },
          data: { status: 'delivered', updated_at: new Date() },
        });
        tickEvents.push(`${delivered.length} allocations auto-delivered`);
      }

      await tx.auditLog.create({
        data: { scenario_id: scenarioId, event_type: 'simulation_tick', agent_name: 'system', reasoning_text: `Clock advanced +${advance_hours}h → ${newSimTime.toISOString()}. ${tickEvents.join('. ')}` },
      });
    });

    // ML tick analysis
    const [zones, allocations, inventory] = await Promise.all([
      prisma.zone.findMany({ where: { scenario_id: scenarioId } }),
      prisma.allocation.findMany({ where: { scenario_id: scenarioId, status: { in: ['proposed', 'confirmed', 'en_route'] } } }),
      prisma.helpingPointInventory.findMany(),
    ]);
    const mlResult = await mlClient.tick(scenarioId, newSimTime, { zones, allocations, inventory });

    for (const entry of mlResult.audit_entries || []) {
      await prisma.auditLog.create({ data: { scenario_id: scenarioId, event_type: entry.event_type, agent_name: entry.agent_name, reasoning_text: entry.reasoning_text } });
    }

    broadcastToScenario(scenarioId, 'simulation.tick', { scenario_id: scenarioId, sim_time: newSimTime, events: tickEvents });
    res.json({ scenario_id: scenarioId, sim_time: newSimTime, events: tickEvents, new_allocations: (mlResult.new_allocations || []).length });
  } catch (err) {
    next(err);
  }
});

// ── POST .../simulation/pause ────────────────────────────────
router.post('/pause', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const scenario = await prisma.scenario.findUnique({ where: { scenario_id: scenarioId } });
    if (!scenario || scenario.status !== 'running') throw createError(409, 'CONFLICT', 'Scenario is not currently running');
    const updated = await prisma.scenario.update({ where: { scenario_id: scenarioId }, data: { status: 'paused', updated_at: new Date() } });
    broadcastToScenario(scenarioId, 'simulation.paused', { scenario_id: scenarioId });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── POST .../simulation/resume ───────────────────────────────
router.post('/resume', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const scenario = await prisma.scenario.findUnique({ where: { scenario_id: scenarioId } });
    if (!scenario || scenario.status !== 'paused') throw createError(409, 'CONFLICT', 'Scenario is not currently paused');
    const updated = await prisma.scenario.update({ where: { scenario_id: scenarioId }, data: { status: 'running', updated_at: new Date() } });
    broadcastToScenario(scenarioId, 'simulation.resumed', { scenario_id: scenarioId });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
