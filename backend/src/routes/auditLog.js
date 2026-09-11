/**
 * auditLog.js — /api/scenarios/:scenarioId/audit-log (Prisma ORM)
 */

import express from 'express';
import prisma from '../config/prisma.js';

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const limit  = parseInt(req.query.limit)  || 50;
    const offset = parseInt(req.query.offset) || 0;
    const { agent_name, event_type } = req.query;

    const where = {
      scenario_id: scenarioId,
      ...(agent_name  && { agent_name }),
      ...(event_type  && { event_type }),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          zone:          { select: { name: true } },
          helping_point: { select: { name: true } },
        },
        orderBy: { created_at: 'desc' },
        take:   limit,
        skip:   offset,
      }),
    ]);

    res.json({
      total,
      limit,
      offset,
      logs: logs.map((l) => ({
        ...l,
        zone_name:  l.zone?.name ?? null,
        point_name: l.helping_point?.name ?? null,
        zone:          undefined,
        helping_point: undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
