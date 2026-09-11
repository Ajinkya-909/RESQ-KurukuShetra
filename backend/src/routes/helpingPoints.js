/**
 * helpingPoints.js — /api/helping-points routes (Prisma ORM)
 */

const router = require('express').Router();
const prisma = require('../config/prisma');
const { createError } = require('../middleware/errorHandler');
const { broadcast } = require('../ws/socketManager');

const INCLUDE_INVENTORY = {
  inventory: {
    include: { resource_type: true },
    orderBy: { resource_type: { name: 'asc' } },
  },
};

// Flatten inventory rows for consistent API shape
const formatPoint = (p) => ({
  ...p,
  inventory: (p.inventory || []).map((i) => ({
    resource_id:     i.resource_id,
    resource_name:   i.resource_type.name,
    unit:            i.resource_type.unit,
    total_stock:     i.total_stock,
    available_stock: i.available_stock,
    reserved_stock:  i.reserved_stock,
    in_transit:      i.in_transit,
    max_capacity:    i.max_capacity,
    replenish_rate:  i.replenish_rate,
  })),
});

// ── GET /api/helping-points ──────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const points = await prisma.helpingPoint.findMany({
      include: INCLUDE_INVENTORY,
      orderBy: { point_id: 'asc' },
    });
    res.json(points.map(formatPoint));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/helping-points/resources/types ──────────────────
// NOTE: must be before /:id to avoid "resources" being treated as an id
router.get('/resources/types', async (req, res, next) => {
  try {
    const types = await prisma.resourceType.findMany({ orderBy: { resource_id: 'asc' } });
    res.json(types);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/helping-points/:id ──────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const point = await prisma.helpingPoint.findUnique({
      where: { point_id: parseInt(req.params.id) },
      include: INCLUDE_INVENTORY,
    });
    if (!point) throw createError(404, 'NOT_FOUND', `Helping point ${req.params.id} not found`);
    res.json(formatPoint(point));
  } catch (err) {
    next(err);
  }
});

// ── POST /api/helping-points ─────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { name, type, lat, lng, reliability_score = 1.0, arrangement_capability = 0.0, inventory = [] } = req.body;

    if (!name || !type || lat == null || lng == null) {
      throw createError(400, 'VALIDATION_ERROR', 'name, type, lat, and lng are required');
    }
    const validTypes = ['ngo', 'govt', 'private', 'hospital', 'military'];
    if (!validTypes.includes(type)) {
      throw createError(400, 'VALIDATION_ERROR', `type must be one of: ${validTypes.join(', ')}`);
    }

    const point = await prisma.helpingPoint.create({
      data: {
        name, type, lat, lng, reliability_score, arrangement_capability,
        inventory: {
          create: inventory.map((i) => ({
            resource_id:     i.resource_id,
            total_stock:     i.total_stock ?? 0,
            available_stock: i.total_stock ?? 0,
            max_capacity:    i.max_capacity ?? 0,
            replenish_rate:  i.replenish_rate ?? 0,
          })),
        },
      },
      include: INCLUDE_INVENTORY,
    });

    const formatted = formatPoint(point);
    broadcast('helping_point.created', formatted);
    res.status(201).json(formatted);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/helping-points/:id ───────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, status, reliability_score, arrangement_capability } = req.body;
    const point = await prisma.helpingPoint.update({
      where: { point_id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(reliability_score !== undefined && { reliability_score }),
        ...(arrangement_capability !== undefined && { arrangement_capability }),
      },
    });
    broadcast('helping_point.updated', point);
    res.json(point);
  } catch (err) {
    if (err.code === 'P2025') return next(createError(404, 'NOT_FOUND', `Helping point ${req.params.id} not found`));
    next(err);
  }
});

// ── PATCH /api/helping-points/:id/inventory ──────────────────
router.patch('/:id/inventory', async (req, res, next) => {
  try {
    const pointId = parseInt(req.params.id);
    const { updates } = req.body;
    if (!Array.isArray(updates) || !updates.length) {
      throw createError(400, 'VALIDATION_ERROR', 'updates must be a non-empty array');
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.helpingPointInventory.update({
          where: { point_id_resource_id: { point_id: pointId, resource_id: u.resource_id } },
          data: {
            ...(u.total_stock !== undefined     && { total_stock: u.total_stock }),
            ...(u.available_stock !== undefined && { available_stock: u.available_stock }),
            ...(u.reserved_stock !== undefined  && { reserved_stock: u.reserved_stock }),
            ...(u.in_transit !== undefined      && { in_transit: u.in_transit }),
            ...(u.max_capacity !== undefined    && { max_capacity: u.max_capacity }),
            ...(u.replenish_rate !== undefined  && { replenish_rate: u.replenish_rate }),
          },
        })
      )
    );

    const point = await prisma.helpingPoint.findUnique({
      where: { point_id: pointId },
      include: INCLUDE_INVENTORY,
    });
    if (!point) throw createError(404, 'NOT_FOUND', `Helping point ${req.params.id} not found`);

    broadcast('helping_point.updated', { point_id: pointId, inventory_changes: updates });
    res.json(formatPoint(point).inventory);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
