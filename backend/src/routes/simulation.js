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
    const helpingPoints = await prisma.helpingPoint.findMany({
      where: { status: 'active' },
      include: { inventory: { include: { resource_type: true } } },
    });
    mlClient.initialAllocation(scenarioId, createdZones, helpingPoints).then(async (mlResult) => {
      // 1. Log audit entries
      for (const entry of mlResult.audit_entries || []) {
        await prisma.auditLog.create({ data: { scenario_id: scenarioId, event_type: entry.event_type, agent_name: entry.agent_name, reasoning_text: entry.reasoning_text } });
      }

      // 2. Write proposed allocations into the database
      const proposedAllocations = mlResult.proposed_allocations || [];
      if (proposedAllocations.length > 0) {
        const validAllocations = proposedAllocations
          .filter((a) => a.zone_id && a.point_id && a.resource_id && a.quantity > 0)
          .map((a) => ({
            scenario_id: scenarioId,
            zone_id:     parseInt(a.zone_id),
            point_id:    parseInt(a.point_id),
            resource_id: parseInt(a.resource_id),
            quantity:    Math.max(1, Math.round(a.quantity)),
            target_lat:  parseFloat(a.target_lat || 0),
            target_lng:  parseFloat(a.target_lng || 0),
            status:      'proposed',
          }));

        if (validAllocations.length > 0) {
          await prisma.allocation.createMany({ data: validAllocations });
          console.log(`✅ [Sim] Created ${validAllocations.length} proposed allocations for scenario ${scenarioId}`);
        }
      }

      // 3. Write zone_needs updates
      const zoneNeedsUpdates = mlResult.zone_needs_updates || [];
      for (const need of zoneNeedsUpdates) {
        if (need.zone_id && need.resource_id) {
          await prisma.zoneNeed.upsert({
            where: { zone_id_resource_id: { zone_id: need.zone_id, resource_id: need.resource_id } },
            update: { quantity_needed: need.quantity_needed, fulfillment_status: need.fulfillment_status || 'shortage' },
            create: { zone_id: need.zone_id, resource_id: need.resource_id, quantity_needed: need.quantity_needed, quantity_fulfilled: 0, fulfillment_status: need.fulfillment_status || 'shortage' },
          });
        }
      }

      // 4. Update zone severity from ML predictions
      for (const su of mlResult.severity_updates || []) {
        if (su.zone_id) {
          await prisma.zone.update({
            where: { zone_id: su.zone_id },
            data: { severity_score: su.severity_score, severity_level: su.severity_level, updated_at: new Date() },
          }).catch(() => {}); // Ignore if zone not found
        }
      }

      broadcastToScenario(scenarioId, 'simulation.started', { scenario_id: scenarioId, zones_created: createdZones.length, sim_time: updated.sim_time, allocations_proposed: proposedAllocations.length });
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

        // Decrement in_transit & total_stock for auto-delivered allocations to maintain inventory consistency
        for (const alloc of delivered) {
          await tx.helpingPointInventory.update({
            where: { point_id_resource_id: { point_id: alloc.point_id, resource_id: alloc.resource_id } },
            data: { in_transit: { decrement: alloc.quantity }, total_stock: { decrement: alloc.quantity } },
          });
          await tx.auditLog.create({
            data: {
              scenario_id: scenarioId,
              event_type: 'allocation_delivered',
              agent_name: 'system',
              zone_id: alloc.zone_id,
              point_id: alloc.point_id,
              allocation_id: alloc.allocation_id,
              reasoning_text: `Auto-delivery completed: Convoy for Allocation #${alloc.allocation_id} reached zone ${alloc.zone_id}`,
            },
          });
        }
        tickEvents.push(`${delivered.length} allocations auto-delivered to disaster zones`);
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
