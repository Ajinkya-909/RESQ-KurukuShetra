/**
 * reports.js — /api/scenarios/:scenarioId/reports routes (Prisma ORM)
 */

import express from 'express';
import prisma from '../config/prisma.js';
import { createError } from '../middleware/errorHandler.js';
import { broadcastToScenario } from '../ws/socketManager.js';
import mlClient from '../services/mlClient.js';

const router = express.Router({ mergeParams: true });

// Haversine distance in meters
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── POST /api/scenarios/:scenarioId/reports ──────────────────
router.post('/', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { lat, lng, raw_text, source = 'field_report' } = req.body;

    if (lat == null || lng == null || !raw_text) {
      throw createError(400, 'VALIDATION_ERROR', 'lat, lng, and raw_text are required');
    }

    // Validate scenario exists
    const scenario = await prisma.scenario.findUnique({ where: { scenario_id: scenarioId } });
    if (!scenario) throw createError(404, 'NOT_FOUND', `Scenario "${scenarioId}" not found`);

    // Determine enclosing zone via haversine
    const zones = await prisma.zone.findMany({
      where: { scenario_id: scenarioId },
      select: { zone_id: true, center_lat: true, center_lng: true, radius_m: true },
    });

    let zone_id = null;
    let minDist = Infinity;
    for (const z of zones) {
      const dist = haversineDistance(lat, lng, z.center_lat, z.center_lng);
      if (dist < minDist) {
        minDist = dist;
        zone_id = z.zone_id;
      }
    }

    const report = await prisma.report.create({
      data: { scenario_id: scenarioId, zone_id, lat: parseFloat(lat), lng: parseFloat(lng), raw_text, source },
    });

    await prisma.auditLog.create({
      data: {
        scenario_id: scenarioId,
        event_type: 'report_received',
        agent_name: 'system',
        zone_id,
        report_id: report.report_id,
        reasoning_text: `SOS received at (${lat}, ${lng}) — ${zone_id ? `assigned to zone ${zone_id}` : 'no enclosing zone'}`,
      },
    });

    broadcastToScenario(scenarioId, 'report.received', report);
    res.status(202).json({ ...report, processing_status: 'queued' });

    // Async ML pipeline
    processReportAsync(report, scenarioId).catch((err) =>
      console.error(`❌ [Report] Async pipeline failed for ${report.report_id}:`, err.message)
    );
  } catch (err) {
    next(err);
  }
});

const processReportAsync = async (report, scenarioId) => {
  console.log(`\n🔄 [Reallocation Engine] Starting reallocation for SOS Report #${report.report_id} in Scenario '${scenarioId}'...`);

  // 1. Delete existing unapproved "proposed" allocations for this scenario
  const deletedProposals = await prisma.allocation.deleteMany({
    where: {
      scenario_id: scenarioId,
      status: 'proposed',
    },
  });
  console.log(`🧹 [Reallocation Engine] Cleared ${deletedProposals.count} stale unapproved 'proposed' allocation(s)`);

  // 2. Fetch updated zones, helping points with inventory, and committed allocations
  const [zones, helpingPoints, allocations] = await Promise.all([
    prisma.zone.findMany({
      where: { scenario_id: scenarioId },
      include: {
        zone_needs: {
          include: { resource_type: true },
        },
      },
    }),
    prisma.helpingPoint.findMany({
      include: {
        inventory: {
          include: { resource_type: true },
        },
      },
    }),
    prisma.allocation.findMany({
      where: {
        scenario_id: scenarioId,
        status: { in: ['confirmed', 'en_route', 'delivered'] },
      },
    }),
  ]);

  console.log(`📡 [Reallocation Engine] Context: Zones=${zones.length}, Depots=${helpingPoints.length}, Committed Allocations=${allocations.length}`);

  // 3. Run ML process report & reallocation solver
  const mlResult = await mlClient.processReport(report, {
    scenario_id: scenarioId,
    zones,
    helping_points: helpingPoints,
    current_allocations: allocations,
  });

  const rawProposed = mlResult.proposed_allocations || [];
  console.log(`🤖 [Reallocation Engine] ML Solver returned ${rawProposed.length} proposed allocation(s)`);

  // 4. Update report with ML output
  await prisma.report.update({
    where: { report_id: report.report_id },
    data: {
      extracted_json:      mlResult.report_update.extracted_json,
      severity_signal:     mlResult.report_update.severity_signal,
      verification_status: mlResult.report_update.verification_status,
    },
  });

  // 5. Log audit entries
  for (const entry of mlResult.audit_entries || []) {
    await prisma.auditLog.create({
      data: {
        scenario_id: scenarioId,
        event_type: entry.event_type,
        agent_name: entry.agent_name,
        zone_id: report.zone_id,
        report_id: report.report_id,
        reasoning_text: entry.reasoning_text,
      },
    });
  }

  // 6. Filter & Insert valid proposed allocations
  const validAllocations = rawProposed
    .filter((a) => a.zone_id && a.point_id && a.resource_id > 0 && a.quantity > 0)
    .map((a) => ({
      scenario_id: scenarioId,
      zone_id:     a.zone_id,
      report_id:   report.report_id,
      point_id:    a.point_id,
      resource_id: a.resource_id,
      quantity:    a.quantity,
      target_lat:  a.target_lat || report.lat,
      target_lng:  a.target_lng || report.lng,
      status:      'proposed',
    }));

  if (validAllocations.length > 0) {
    await prisma.allocation.createMany({ data: validAllocations });
    console.log(`✅ [Reallocation Engine] Successfully inserted ${validAllocations.length} reallocated proposed allocation(s) into database.`);
  } else {
    console.warn(`⚠️ [Reallocation Engine] No valid new proposed allocations were generated.`);
  }

  // 7. Broadcast WebSocket updates
  broadcastToScenario(scenarioId, 'report.processed', {
    report_id:                report.report_id,
    extracted_json:           mlResult.report_update.extracted_json,
    severity_signal:          mlResult.report_update.severity_signal,
    verification_status:      mlResult.report_update.verification_status,
    proposed_allocations_count: validAllocations.length,
  });

  broadcastToScenario(scenarioId, 'allocation.reallocated', {
    reason: `Reallocated resources following SOS Report #${report.report_id}`,
    proposed_allocations_count: validAllocations.length,
  });
};

// ── GET /api/scenarios/:scenarioId/reports ───────────────────
router.get('/', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { status, zone_id } = req.query;

    const reports = await prisma.report.findMany({
      where: {
        scenario_id: scenarioId,
        ...(status && { verification_status: status }),
        ...(zone_id && { zone_id: parseInt(zone_id) }),
      },
      include: { zone: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
    });

    res.json(reports.map((r) => ({ ...r, zone_name: r.zone?.name ?? null, zone: undefined })));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/scenarios/:scenarioId/reports/:reportId ─────────
router.get('/:reportId', async (req, res, next) => {
  try {
    const report = await prisma.report.findFirst({
      where: { report_id: parseInt(req.params.reportId), scenario_id: req.params.scenarioId },
      include: {
        zone: { select: { name: true } },
        allocations: {
          include: {
            helping_point: { select: { name: true } },
            resource_type: { select: { name: true } },
          },
        },
        audit_log: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!report) throw createError(404, 'NOT_FOUND', `Report ${req.params.reportId} not found`);

    res.json({
      ...report,
      zone_name: report.zone?.name ?? null,
      zone: undefined,
      allocations: report.allocations.map((a) => ({
        allocation_id: a.allocation_id,
        point_name:    a.helping_point.name,
        resource_name: a.resource_type.name,
        quantity:      a.quantity,
        status:        a.status,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
