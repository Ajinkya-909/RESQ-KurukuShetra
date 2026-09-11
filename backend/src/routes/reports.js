/**
 * reports.js — /api/scenarios/:scenarioId/reports routes (Prisma ORM)
 */

const router = require('express').Router({ mergeParams: true });
const prisma = require('../config/prisma');
const { createError } = require('../middleware/errorHandler');
const { broadcastToScenario } = require('../ws/socketManager');
const mlClient = require('../services/mlClient');

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

    // Determine enclosing zone via haversine
    const zones = await prisma.zone.findMany({
      where: { scenario_id: scenarioId, status: 'active' },
      select: { zone_id: true, center_lat: true, center_lng: true, radius_m: true },
    });

    let zone_id = null;
    let minDist = Infinity;
    for (const z of zones) {
      const dist = haversineDistance(lat, lng, z.center_lat, z.center_lng);
      if (dist <= z.radius_m && dist < minDist) { minDist = dist; zone_id = z.zone_id; }
    }

    const report = await prisma.report.create({
      data: { scenario_id: scenarioId, zone_id, lat, lng, raw_text, source },
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
  const [zones, helpingPoints, allocations] = await Promise.all([
    prisma.zone.findMany({ where: { scenario_id: scenarioId } }),
    prisma.helpingPoint.findMany({ include: { inventory: true } }),
    prisma.allocation.findMany({ where: { scenario_id: scenarioId, status: { in: ['proposed', 'confirmed', 'en_route'] } } }),
  ]);

  const mlResult = await mlClient.processReport(report, { scenario_id: scenarioId, zones, helping_points: helpingPoints, current_allocations: allocations });

  // Update report with ML output
  await prisma.report.update({
    where: { report_id: report.report_id },
    data: {
      extracted_json:      mlResult.report_update.extracted_json,
      severity_signal:     mlResult.report_update.severity_signal,
      verification_status: mlResult.report_update.verification_status,
    },
  });

  // Log audit entries
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

  // Insert proposed allocations
  if ((mlResult.proposed_allocations || []).length > 0) {
    await prisma.allocation.createMany({
      data: mlResult.proposed_allocations.map((a) => ({
        scenario_id: scenarioId,
        zone_id:     a.zone_id,
        report_id:   report.report_id,
        point_id:    a.point_id,
        resource_id: a.resource_id,
        quantity:    a.quantity,
        target_lat:  a.target_lat,
        target_lng:  a.target_lng,
      })),
    });
  }

  broadcastToScenario(scenarioId, 'report.processed', {
    report_id:                report.report_id,
    extracted_json:           mlResult.report_update.extracted_json,
    severity_signal:          mlResult.report_update.severity_signal,
    verification_status:      mlResult.report_update.verification_status,
    proposed_allocations_count: (mlResult.proposed_allocations || []).length,
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

module.exports = router;
