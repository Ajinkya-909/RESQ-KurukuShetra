/**
 * allocations.js — /api/scenarios/:scenarioId/allocations routes (Prisma ORM)
 */

const router = require('express').Router({ mergeParams: true });
const prisma = require('../config/prisma');
const { createError } = require('../middleware/errorHandler');
const { broadcastToScenario } = require('../ws/socketManager');

const VALID_TRANSITIONS = {
  proposed:  ['confirmed', 'cancelled', 'on_hold'],
  on_hold:   ['confirmed', 'cancelled', 'unfulfilled'],
  confirmed: ['en_route', 'cancelled'],
  en_route:  ['delivered'],
};

const validateTransitions = (allocations, targetStatus) => {
  for (const alloc of allocations) {
    const allowed = VALID_TRANSITIONS[alloc.status];
    if (!allowed) throw createError(409, 'CONFLICT', `Allocation ${alloc.allocation_id} is in terminal state "${alloc.status}"`);
    if (!allowed.includes(targetStatus)) {
      throw createError(409, 'CONFLICT', `Invalid transition for ${alloc.allocation_id}: ${alloc.status} → ${targetStatus}. Allowed: ${allowed.join(', ')}`);
    }
  }
};

// ── GET /api/scenarios/:scenarioId/allocations ───────────────
router.get('/', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { status, zone_id, point_id } = req.query;

    const allocations = await prisma.allocation.findMany({
      where: {
        scenario_id: scenarioId,
        ...(status   && { status }),
        ...(zone_id  && { zone_id: parseInt(zone_id) }),
        ...(point_id && { point_id: parseInt(point_id) }),
      },
      include: {
        zone:          { select: { name: true } },
        helping_point: { select: { name: true, lat: true, lng: true } },
        resource_type: { select: { name: true, unit: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json(allocations.map((a) => ({
      ...a,
      zone_name:     a.zone.name,
      point_name:    a.helping_point.name,
      point_lat:     a.helping_point.lat,
      point_lng:     a.helping_point.lng,
      resource_name: a.resource_type.name,
      resource_unit: a.resource_type.unit,
      zone:          undefined,
      helping_point: undefined,
      resource_type: undefined,
    })));
  } catch (err) {
    next(err);
  }
});

// ── POST .../allocations/approve ─────────────────────────────
router.post('/approve', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { allocation_ids } = req.body;
    if (!Array.isArray(allocation_ids) || !allocation_ids.length) {
      throw createError(400, 'VALIDATION_ERROR', 'allocation_ids must be a non-empty array');
    }

    const allocations = await prisma.allocation.findMany({
      where: { allocation_id: { in: allocation_ids }, scenario_id: scenarioId },
    });
    if (allocations.length !== allocation_ids.length) throw createError(404, 'NOT_FOUND', 'One or more allocation IDs not found');

    validateTransitions(allocations, 'confirmed');

    await prisma.$transaction(async (tx) => {
      // Update status
      await tx.allocation.updateMany({ where: { allocation_id: { in: allocation_ids } }, data: { status: 'confirmed', updated_at: new Date() } });

      // Inventory & zone_needs updates
      for (const alloc of allocations) {
        await tx.helpingPointInventory.update({
          where: { point_id_resource_id: { point_id: alloc.point_id, resource_id: alloc.resource_id } },
          data: { available_stock: { decrement: alloc.quantity }, reserved_stock: { increment: alloc.quantity } },
        });

        const need = await tx.zoneNeed.findUnique({
          where: { zone_id_resource_id: { zone_id: alloc.zone_id, resource_id: alloc.resource_id } },
        });
        if (need) {
          const newFulfilled = need.quantity_fulfilled + alloc.quantity;
          await tx.zoneNeed.update({
            where: { zone_id_resource_id: { zone_id: alloc.zone_id, resource_id: alloc.resource_id } },
            data: {
              quantity_fulfilled: { increment: alloc.quantity },
              fulfillment_status: newFulfilled >= need.quantity_needed * 0.9 ? 'balanced' : 'shortage',
            },
          });
        }

        await tx.auditLog.create({
          data: {
            scenario_id: scenarioId,
            event_type: 'allocation_confirmed',
            agent_name: 'system',
            zone_id: alloc.zone_id,
            point_id: alloc.point_id,
            allocation_id: alloc.allocation_id,
            reasoning_text: `Allocation ${alloc.allocation_id} approved — ${alloc.quantity} units reserved`,
          },
        });
      }
    });

    broadcastToScenario(scenarioId, 'allocation.approved', { allocation_ids, status: 'confirmed' });
    res.json({ approved: allocation_ids, status: 'confirmed', inventory_updated: true });
  } catch (err) {
    next(err);
  }
});

// ── POST .../allocations/reject ──────────────────────────────
router.post('/reject', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { allocation_ids, reason = 'Rejected by coordinator' } = req.body;
    if (!Array.isArray(allocation_ids) || !allocation_ids.length) {
      throw createError(400, 'VALIDATION_ERROR', 'allocation_ids must be a non-empty array');
    }

    const allocations = await prisma.allocation.findMany({ where: { allocation_id: { in: allocation_ids }, scenario_id: scenarioId } });
    validateTransitions(allocations, 'cancelled');

    await prisma.$transaction(async (tx) => {
      await tx.allocation.updateMany({ where: { allocation_id: { in: allocation_ids } }, data: { status: 'cancelled', hold_reason: reason, updated_at: new Date() } });
      for (const alloc of allocations) {
        await tx.auditLog.create({
          data: { scenario_id: scenarioId, event_type: 'allocation_cancelled', agent_name: 'system', zone_id: alloc.zone_id, allocation_id: alloc.allocation_id, reasoning_text: `Allocation ${alloc.allocation_id} rejected: ${reason}` },
        });
      }
    });

    broadcastToScenario(scenarioId, 'allocation.rejected', { allocation_ids, status: 'cancelled', reason });
    res.json({ rejected: allocation_ids, status: 'cancelled' });
  } catch (err) {
    next(err);
  }
});

// ── POST .../allocations/dispatch ────────────────────────────
router.post('/dispatch', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { allocation_ids } = req.body;
    if (!Array.isArray(allocation_ids) || !allocation_ids.length) {
      throw createError(400, 'VALIDATION_ERROR', 'allocation_ids must be a non-empty array');
    }

    const allocations = await prisma.allocation.findMany({ where: { allocation_id: { in: allocation_ids }, scenario_id: scenarioId } });
    validateTransitions(allocations, 'en_route');

    await prisma.$transaction(async (tx) => {
      await tx.allocation.updateMany({ where: { allocation_id: { in: allocation_ids } }, data: { status: 'en_route', updated_at: new Date() } });
      for (const alloc of allocations) {
        await tx.helpingPointInventory.update({
          where: { point_id_resource_id: { point_id: alloc.point_id, resource_id: alloc.resource_id } },
          data: { reserved_stock: { decrement: alloc.quantity }, in_transit: { increment: alloc.quantity } },
        });
        await tx.auditLog.create({
          data: { scenario_id: scenarioId, event_type: 'allocation_dispatched', agent_name: 'system', zone_id: alloc.zone_id, point_id: alloc.point_id, allocation_id: alloc.allocation_id, reasoning_text: `Resources dispatched from point ${alloc.point_id} en route to zone ${alloc.zone_id}` },
        });
      }
    });

    broadcastToScenario(scenarioId, 'allocation.dispatched', { allocation_ids, status: 'en_route' });
    res.json({ dispatched: allocation_ids, status: 'en_route' });
  } catch (err) {
    next(err);
  }
});

// ── POST .../allocations/deliver ─────────────────────────────
router.post('/deliver', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { allocation_ids } = req.body;
    if (!Array.isArray(allocation_ids) || !allocation_ids.length) {
      throw createError(400, 'VALIDATION_ERROR', 'allocation_ids must be a non-empty array');
    }

    const allocations = await prisma.allocation.findMany({ where: { allocation_id: { in: allocation_ids }, scenario_id: scenarioId } });
    validateTransitions(allocations, 'delivered');

    await prisma.$transaction(async (tx) => {
      await tx.allocation.updateMany({ where: { allocation_id: { in: allocation_ids } }, data: { status: 'delivered', updated_at: new Date() } });
      for (const alloc of allocations) {
        await tx.helpingPointInventory.update({
          where: { point_id_resource_id: { point_id: alloc.point_id, resource_id: alloc.resource_id } },
          data: { in_transit: { decrement: alloc.quantity }, total_stock: { decrement: alloc.quantity } },
        });
        await tx.auditLog.create({
          data: { scenario_id: scenarioId, event_type: 'allocation_delivered', agent_name: 'system', zone_id: alloc.zone_id, point_id: alloc.point_id, allocation_id: alloc.allocation_id, reasoning_text: `Delivery confirmed to zone ${alloc.zone_id}` },
        });
      }
    });

    broadcastToScenario(scenarioId, 'allocation.delivered', { allocation_ids, status: 'delivered' });
    res.json({ delivered: allocation_ids, status: 'delivered' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
