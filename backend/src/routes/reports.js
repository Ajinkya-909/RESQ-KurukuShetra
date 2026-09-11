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

// Calculate text similarity between two SOS messages (Jaccard token similarity)
const calculateTextSimilarity = (textA = '', textB = '') => {
  const getTokens = (t) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );
  const setA = getTokens(textA);
  const setB = getTokens(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
};

// ── POST /api/scenarios/:scenarioId/reports ──────────────────
router.post('/', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { lat, lng, raw_text, source = 'field_report', needed_resources = [], image_url, image_data } = req.body;

    if (lat == null || lng == null || !raw_text) {
      throw createError(400, 'VALIDATION_ERROR', 'lat, lng, and raw_text are required');
    }

    // Validate scenario exists
    const scenario = await prisma.scenario.findUnique({ where: { scenario_id: scenarioId } });
    if (!scenario) throw createError(404, 'NOT_FOUND', `Scenario "${scenarioId}" not found`);

    // 1. Geofencing & Nearest Zone Assignment
    const zones = await prisma.zone.findMany({
      where: { scenario_id: scenarioId },
      select: { zone_id: true, name: true, center_lat: true, center_lng: true, radius_m: true },
    });

    let zone_id = null;
    let minDist = Infinity;
    let enclosingZone = null;

    for (const z of zones) {
      const dist = haversineDistance(lat, lng, z.center_lat, z.center_lng);
      if (dist < minDist) {
        minDist = dist;
        enclosingZone = z;
      }
    }

    // If within 1.5x zone radius, assign to zone; otherwise flag as remote out-of-corridor SOS
    if (enclosingZone && minDist <= enclosingZone.radius_m * 1.5) {
      zone_id = enclosingZone.zone_id;
    }

    const initialExtracted = {};
    if (image_url) initialExtracted.image_url = image_url;
    if (image_data) initialExtracted.image_data = image_data;

    const report = await prisma.report.create({
      data: {
        scenario_id: scenarioId,
        zone_id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        raw_text,
        source,
        extracted_json: Object.keys(initialExtracted).length > 0 ? initialExtracted : undefined,
        verification_status: 'unverified',
      },
    });

    await prisma.auditLog.create({
      data: {
        scenario_id: scenarioId,
        event_type: 'report_received',
        agent_name: 'system',
        zone_id,
        report_id: report.report_id,
        reasoning_text: `SOS received at (${lat}, ${lng}) — ${zone_id ? `assigned to Zone "${enclosingZone?.name}" (${Math.round(minDist)}m from center)` : `isolated/out-of-corridor (${Math.round(minDist)}m from nearest zone)`}${needed_resources.length ? `. Requested: ${needed_resources.join(', ')}` : ''}${image_url || image_data ? ' (Field Photo attached)' : ''}`,
      },
    });

    broadcastToScenario(scenarioId, 'report.received', report);
    res.status(202).json({ ...report, processing_status: 'queued' });

    // Attach needed_resources & image for ML & direct allocation processing
    const reportWithNeeds = {
      ...report,
      needed_resources,
      image_url: image_url || report.extracted_json?.image_url,
      image_data: image_data || report.extracted_json?.image_data
    };

    // Async verification, duplicate detection & direct allocation pipeline
    processReportAsync(reportWithNeeds, scenarioId).catch((err) =>
      console.error(`❌ [Report] Async pipeline failed for ${report.report_id}:`, err.message)
    );
  } catch (err) {
    next(err);
  }
});

const processReportAsync = async (report, scenarioId) => {
  console.log(`\n🚨 [Report Pipeline] Processing SOS Report #${report.report_id} at (${report.lat}, ${report.lng})...`);

  // 1. Fetch recent reports (last 45 min) in this scenario to check for duplicates
  const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000);
  const recentReports = await prisma.report.findMany({
    where: {
      scenario_id: scenarioId,
      report_id: { not: report.report_id },
      created_at: { gte: fortyFiveMinsAgo },
      NOT: { verification_status: 'rejected' },
    },
    orderBy: { created_at: 'desc' },
  });

  // 2. Duplicate Detection Engine: Multi-signal scoring (Location + Time + Semantic Text)
  let duplicateCandidate = null;
  let maxDuplicateScore = 0;

  for (const other of recentReports) {
    const dist = haversineDistance(report.lat, report.lng, other.lat, other.lng);
    const timeDiffMins = Math.abs(new Date(report.created_at).getTime() - new Date(other.created_at).getTime()) / (1000 * 60);
    const textSim = calculateTextSimilarity(report.raw_text, other.raw_text);

    // Multi-signal similarity composite score
    const proximityScore = dist < 600 ? Math.max(0, 1 - dist / 600) : 0;
    const timeScore = Math.max(0, 1 - timeDiffMins / 45);
    const compositeScore = 0.5 * proximityScore + 0.35 * textSim + 0.15 * timeScore;

    if (compositeScore > maxDuplicateScore && compositeScore >= 0.65) {
      maxDuplicateScore = compositeScore;
      duplicateCandidate = { other, dist, timeDiffMins, compositeScore };
    }
  }

  // Handle Duplicate Flagging
  if (duplicateCandidate) {
    const { other, dist, compositeScore } = duplicateCandidate;
    console.log(`⚠️ [Report Pipeline] Duplicate SOS cluster detected! Matches Report #${other.report_id} (Score: ${(compositeScore * 100).toFixed(0)}%, Dist: ${Math.round(dist)}m)`);

    // Flag report as duplicate and create DuplicateFlag entry
    await prisma.report.update({
      where: { report_id: report.report_id },
      data: {
        verification_status: 'duplicate',
        severity_signal: 0.70,
      },
    });

    await prisma.duplicateFlag.create({
      data: {
        scenario_id: scenarioId,
        zone_id: report.zone_id,
        report_id_1: other.report_id,
        report_id_2: report.report_id,
        duplicate_score: Math.round(compositeScore * 100) / 100,
        resolution: 'needs_review',
      },
    });

    await prisma.auditLog.create({
      data: {
        scenario_id: scenarioId,
        event_type: 'duplicate_detected',
        agent_name: 'VerificationAgent',
        zone_id: report.zone_id,
        report_id: report.report_id,
        reasoning_text: `Duplicate SOS alert intercepted: Report #${report.report_id} matches active Report #${other.report_id} (${Math.round(dist)}m away, similarity ${(compositeScore * 100).toFixed(0)}%). Linked to cluster without triggering redundant double-dispatch.`,
      },
    });

    broadcastToScenario(scenarioId, 'report.processed', {
      report_id: report.report_id,
      verification_status: 'duplicate',
      severity_signal: 0.70,
      is_duplicate: true,
      matched_report_id: other.report_id,
      duplicate_score: compositeScore,
    });

    broadcastToScenario(scenarioId, 'duplicate.detected', {
      report_id_1: other.report_id,
      report_id_2: report.report_id,
      duplicate_score: compositeScore,
    });

    return; // Exit early: do NOT create duplicate redundant convoys
  }

  // 3. Valid Non-Duplicate Report: Fetch context for Direct Micro-SOS Triage
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
      where: { status: 'active' },
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

  // 4. Scoped Proposal Cleanup: Delete ONLY unapproved proposals for THIS report if any
  await prisma.allocation.deleteMany({
    where: {
      scenario_id: scenarioId,
      report_id: report.report_id,
      status: 'proposed',
    },
  });

  // 5. Run ML Processing & Severity Scoring
  const mlResult = await mlClient.processReport(report, {
    scenario_id: scenarioId,
    zones,
    helping_points: helpingPoints,
    current_allocations: allocations,
  });

  // 6. Direct Micro-SOS Allocation Matching: Target report coordinates & report_id
  const directAllocations = [];
  const neededResList = report.needed_resources || [];
  const rawTextLower = (report.raw_text || '').toLowerCase();

  // Determine explicit requested supplies
  const targetResourceTypes = [];
  if (neededResList.some((r) => r.includes('water')) || rawTextLower.includes('water') || rawTextLower.includes('drink')) {
    targetResourceTypes.push({ name: 'water', qty: 50 });
  }
  if (neededResList.some((r) => r.includes('food')) || rawTextLower.includes('food') || rawTextLower.includes('ration')) {
    targetResourceTypes.push({ name: 'food', qty: 30 });
  }
  if (neededResList.some((r) => r.includes('med')) || rawTextLower.includes('injur') || rawTextLower.includes('med') || rawTextLower.includes('hospital')) {
    targetResourceTypes.push({ name: 'medical', qty: 15 });
  }
  if (neededResList.some((r) => r.includes('boat')) || rawTextLower.includes('boat') || rawTextLower.includes('submerge')) {
    targetResourceTypes.push({ name: 'rescue_boat', qty: 2 });
  }
  if (neededResList.some((r) => r.includes('team') || r.includes('rescue')) || rawTextLower.includes('strand') || rawTextLower.includes('trap')) {
    targetResourceTypes.push({ name: 'rescue_team', qty: 2 });
  }
  if (neededResList.some((r) => r.includes('shelter') || r.includes('tent')) || rawTextLower.includes('shelter') || rawTextLower.includes('tent')) {
    targetResourceTypes.push({ name: 'shelter', qty: 5 });
  }
  if (neededResList.some((r) => r.includes('ambulance')) || rawTextLower.includes('ambulance') || rawTextLower.includes('critical')) {
    targetResourceTypes.push({ name: 'ambulance', qty: 1 });
  }

  // If no explicit keyword matches, provide standard emergency relief
  if (targetResourceTypes.length === 0) {
    targetResourceTypes.push({ name: 'food', qty: 25 }, { name: 'water', qty: 40 });
  }

  // Match each requested item to the closest viable depot with stock
  for (const reqItem of targetResourceTypes) {
    let bestPoint = null;
    let bestInv = null;
    let bestScore = -1;

    for (const pt of helpingPoints) {
      for (const inv of pt.inventory || []) {
        const invName = (inv.resource_type?.name || '').toLowerCase();
        if (invName.includes(reqItem.name) || reqItem.name.includes(invName)) {
          const avail = inv.available_stock || 0;
          if (avail > 0) {
            const dist = haversineDistance(report.lat, report.lng, pt.lat, pt.lng);
            // Score based on proximity and reliability
            const score = (avail * (pt.reliability_score || 1.0)) / (dist + 500);
            if (score > bestScore) {
              bestScore = score;
              bestPoint = pt;
              bestInv = inv;
            }
          }
        }
      }
    }

    if (bestPoint && bestInv) {
      const allocateQty = Math.min(bestInv.available_stock, reqItem.qty);
      if (allocateQty > 0) {
        directAllocations.push({
          scenario_id: scenarioId,
          zone_id: report.zone_id || zones[0]?.zone_id || 1,
          report_id: report.report_id,
          point_id: bestPoint.point_id,
          resource_id: bestInv.resource_id,
          quantity: allocateQty,
          target_lat: report.lat,
          target_lng: report.lng,
          status: 'proposed',
        });
      }
    }
  }

  // Combine direct allocations with ML solver suggestions
  const allProposed = [...directAllocations];
  for (const mlAlloc of mlResult.proposed_allocations || []) {
    // If not already covered by direct allocation
    const alreadyCovered = allProposed.some(
      (a) => a.point_id === mlAlloc.point_id && a.resource_id === mlAlloc.resource_id
    );
    if (!alreadyCovered && mlAlloc.quantity > 0) {
      allProposed.push({
        scenario_id: scenarioId,
        zone_id: mlAlloc.zone_id || report.zone_id || 1,
        report_id: report.report_id,
        point_id: mlAlloc.point_id,
        resource_id: mlAlloc.resource_id,
        quantity: Math.max(1, Math.round(mlAlloc.quantity)),
        target_lat: report.lat,
        target_lng: report.lng,
        status: 'proposed',
      });
    }
  }

  // 7. Update Report Record with ML verification and extracted metadata
  const verifiedSeverity = mlResult.report_update?.severity_signal || 0.80;
  await prisma.report.update({
    where: { report_id: report.report_id },
    data: {
      extracted_json: mlResult.report_update?.extracted_json || {},
      severity_signal: verifiedSeverity,
      verification_status: 'verified',
    },
  });

  // 8. Log Verification & Direct Triage Audit Entries
  await prisma.auditLog.create({
    data: {
      scenario_id: scenarioId,
      event_type: 'report_verified',
      agent_name: 'VerificationAgent',
      zone_id: report.zone_id,
      report_id: report.report_id,
      reasoning_text: `SOS Report #${report.report_id} verified. No duplicate collision found within 600m. Severity scored at ${(verifiedSeverity * 10).toFixed(1)}/10. Direct triage initiated.`,
    },
  });

  if (allProposed.length > 0) {
    await prisma.allocation.createMany({ data: allProposed });
    console.log(`✅ [Report Pipeline] Successfully proposed ${allProposed.length} direct allocation(s) for SOS Report #${report.report_id} at (${report.lat}, ${report.lng}).`);

    await prisma.auditLog.create({
      data: {
        scenario_id: scenarioId,
        event_type: 'reallocation_proposed',
        agent_name: 'CoordinatorAgent',
        zone_id: report.zone_id,
        report_id: report.report_id,
        reasoning_text: `Direct emergency dispatch generated: ${allProposed.length} shipment(s) proposed from nearest depots directly to SOS Report #${report.report_id} GPS location.`,
      },
    });
  }

  // 9. Real-Time Broadcasts to Command Center
  broadcastToScenario(scenarioId, 'report.processed', {
    report_id: report.report_id,
    extracted_json: mlResult.report_update?.extracted_json,
    severity_signal: verifiedSeverity,
    verification_status: 'verified',
    proposed_allocations_count: allProposed.length,
  });

  broadcastToScenario(scenarioId, 'allocation.reallocated', {
    reason: `Direct emergency dispatch proposed for SOS Report #${report.report_id}`,
    proposed_allocations_count: allProposed.length,
    report_id: report.report_id,
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

// ── POST /api/scenarios/:scenarioId/reports/:reportId/visual-analysis ──
router.post('/:reportId/visual-analysis', async (req, res, next) => {
  try {
    const { scenarioId, reportId } = req.params;
    const report = await prisma.report.findFirst({
      where: { report_id: parseInt(reportId, 10), scenario_id: scenarioId },
    });
    if (!report) throw createError(404, 'NOT_FOUND', `Report #${reportId} not found`);

    const imageInput =
      req.body.image_input ||
      req.body.image_url ||
      req.body.image_data ||
      report.extracted_json?.image_data ||
      report.extracted_json?.image_url;

    if (!imageInput) {
      throw createError(400, 'VALIDATION_ERROR', 'No image input provided for visual analysis');
    }

    const visualResult = await mlClient.analyzeVision(imageInput, req.body.confidence_threshold);

    const currentExtracted = report.extracted_json && typeof report.extracted_json === 'object' ? report.extracted_json : {};
    const updatedExtracted = {
      ...currentExtracted,
      visual_evidence: visualResult,
    };

    await prisma.report.update({
      where: { report_id: report.report_id },
      data: { extracted_json: updatedExtracted },
    });

    res.json(visualResult);
  } catch (err) {
    next(err);
  }
});

export default router;
