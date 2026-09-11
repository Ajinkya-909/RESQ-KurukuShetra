/**
 * responseCopilotService.js — Backend Service for RESQ Response Copilot
 *
 * Provides deterministic SOS incident clustering, priority queuing,
 * ground-truth reasoning generation, and mission lifecycle tracking.
 *
 * Uses existing Prisma models (Report, Allocation, Zone, HelpingPoint, Inventory).
 * Does NOT alter database schema or ML models.
 */

import prisma from '../config/prisma.js';

// Configurable constants for incident detection
export const DISTANCE_THRESHOLD_METERS = 500;
export const TIME_WINDOW_MINUTES = 15;

/**
 * Calculate Haversine distance in meters between two lat/lng points.
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // meters
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Cluster array of reports using single-linkage distance & time window thresholding.
 */
const clusterReports = (reports) => {
  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < reports.length; i++) {
    if (visited.has(reports[i].report_id)) continue;

    const cluster = [reports[i]];
    visited.add(reports[i].report_id);

    for (let j = i + 1; j < reports.length; j++) {
      if (visited.has(reports[j].report_id)) continue;

      const r1 = reports[i];
      const r2 = reports[j];

      const dist = haversineDistance(r1.lat, r1.lng, r2.lat, r2.lng);
      const timeDiffMinutes = Math.abs(new Date(r1.created_at) - new Date(r2.created_at)) / (1000 * 60);

      if (dist <= DISTANCE_THRESHOLD_METERS && timeDiffMinutes <= TIME_WINDOW_MINUTES) {
        cluster.push(r2);
        visited.add(r2.report_id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
};

/**
 * Format severity score float (0.0 to 1.0) into level text.
 */
const getSeverityLevel = (score) => {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.35) return 'MODERATE';
  return 'LOW';
};

/**
 * Main function to generate Copilot state for a given scenario.
 */
export const getIncidentsAndCopilotState = async (scenarioId) => {
  const [scenario, reports, proposedAllocations, activeAllocations, zones, helpingPoints] = await Promise.all([
    prisma.scenario.findUnique({ where: { scenario_id: scenarioId } }),
    prisma.report.findMany({
      where: { scenario_id: scenarioId, NOT: { verification_status: 'rejected' } },
      include: { zone: { select: { name: true, severity_score: true } } },
      orderBy: { created_at: 'desc' },
    }),
    prisma.allocation.findMany({
      where: { scenario_id: scenarioId, status: 'proposed' },
      include: {
        helping_point: { select: { point_id: true, name: true, lat: true, lng: true } },
        resource_type: { select: { resource_id: true, name: true, unit: true } },
        zone: { select: { name: true } },
      },
    }),
    prisma.allocation.findMany({
      where: { scenario_id: scenarioId, status: { in: ['confirmed', 'en_route', 'delivered'] } },
      include: {
        helping_point: { select: { point_id: true, name: true } },
        resource_type: { select: { resource_id: true, name: true, unit: true } },
        zone: { select: { name: true } },
      },
      orderBy: { updated_at: 'desc' },
    }),
    prisma.zone.findMany({
      where: { scenario_id: scenarioId },
    }),
    prisma.helpingPoint.findMany({
      include: {
        inventory: { include: { resource_type: true } },
      },
    }),
  ]);

  if (!scenario) {
    throw new Error(`Scenario "${scenarioId}" not found`);
  }

  // 1. Perform deterministic report clustering
  const rawClusters = clusterReports(reports);

  // 2. Map raw report clusters to human-facing Emergency Incidents
  const incidents = rawClusters.map((cluster, idx) => {
    const reportIds = cluster.map((r) => r.report_id);
    const avgLat = cluster.reduce((sum, r) => sum + r.lat, 0) / cluster.length;
    const avgLng = cluster.reduce((sum, r) => sum + r.lng, 0) / cluster.length;

    // Aggregate affected people & medical cases from extracted NLP JSON or raw_text
    let affectedPeople = 0;
    let medicalCases = 0;
    let maxSeveritySignal = 0;

    cluster.forEach((r) => {
      maxSeveritySignal = Math.max(maxSeveritySignal, r.severity_signal || 0.5);

      const json = r.extracted_json || {};
      const stranded = Number(json.stranded_count || 0);
      affectedPeople += stranded > 0 ? stranded : 5; // Default 5 affected per report if unspecified

      const medicalNeed = (json.medical_need || '').toLowerCase();
      const rawText = (r.raw_text || '').toLowerCase();
      if (
        medicalNeed === 'high' ||
        medicalNeed === 'moderate' ||
        rawText.includes('medical') ||
        rawText.includes('injur') ||
        rawText.includes('hospital') ||
        rawText.includes('doctor')
      ) {
        medicalCases += 1;
      }
    });

    const severityLevel = getSeverityLevel(maxSeveritySignal);

    // Compute Priority Score
    // Priority = (Severity * 40) + (min(Affected, 50) * 0.5) + (MedicalCases * 10) + (SOSCount * 5)
    const priorityScore =
      maxSeveritySignal * 40 +
      Math.min(affectedPeople, 50) * 0.5 +
      medicalCases * 10 +
      cluster.length * 5;

    // Match existing proposed allocations generated by OR-Tools for reports in this cluster
    const matchingProposed = proposedAllocations.filter(
      (a) => a.report_id && reportIds.includes(a.report_id)
    );

    // If no report-specific proposed allocations exist, look for zone-level proposed allocations matching cluster zone
    const clusterZoneId = cluster[0]?.zone_id;
    const zoneProposed =
      matchingProposed.length > 0
        ? matchingProposed
        : proposedAllocations.filter((a) => a.zone_id === clusterZoneId);

    const targetAllocations = zoneProposed.length > 0 ? zoneProposed : [];
    const allocationIds = targetAllocations.map((a) => a.allocation_id);

    // Format recommended response resources
    const itemsMap = new Map();
    let primaryDepotName = null;

    targetAllocations.forEach((alloc) => {
      const resName = alloc.resource_type.name;
      const currentQty = itemsMap.get(resName) || 0;
      itemsMap.set(resName, currentQty + alloc.quantity);
      if (!primaryDepotName) primaryDepotName = alloc.helping_point.name;
    });

    // Fallback resource recommendation if OR-Tools hasn't proposed allocations yet
    if (itemsMap.size === 0 && helpingPoints.length > 0) {
      const firstDepot = helpingPoints[0];
      primaryDepotName = firstDepot.name;
      if (medicalCases > 0) itemsMap.set('Medical Kits', Math.max(10, medicalCases * 5));
      itemsMap.set('Drinking Water', Math.max(20, affectedPeople * 2));
      itemsMap.set('Food Packets', Math.max(15, affectedPeople));
    }

    const recommendedResources = Array.from(itemsMap.entries()).map(([name, qty]) => ({
      resource_name: name,
      quantity: Math.round(qty),
    }));

    // Build Ground-Truth "WHY?" Reasoning List
    const reasons = [];
    if (cluster.length === 1) {
      reasons.push(`✓ Single verified SOS report received at pinned location.`);
    } else {
      reasons.push(`✓ ${cluster.length} SOS field reports detected within ${DISTANCE_THRESHOLD_METERS}m cluster radius.`);
    }

    if (affectedPeople > 0) {
      reasons.push(`✓ Estimated ${affectedPeople} citizens stranded or requiring immediate relief.`);
    }

    if (medicalCases > 0) {
      reasons.push(`✓ ${medicalCases} medical emergency request(s) flagged in transcript.`);
    }

    if (maxSeveritySignal >= 0.7) {
      reasons.push(`✓ ML Severity Agent score: ${maxSeveritySignal.toFixed(2)} (${severityLevel}).`);
    }

    if (primaryDepotName) {
      reasons.push(`✓ Suitable response resources available at ${primaryDepotName}.`);
    }

    // Sector / Location name
    const sectorName = cluster[0]?.zone?.name || `Sector (${avgLat.toFixed(4)}, ${avgLng.toFixed(4)})`;
    const incidentName = `${sectorName} SOS Incident #${idx + 1}`;

    // Determine status
    let status = 'ACTION_REQUIRED';
    if (matchingProposed.length === 0 && activeAllocations.some((a) => reportIds.includes(a.report_id))) {
      status = 'APPROVED';
    }

    return {
      incident_id: `inc_${scenarioId}_${idx + 1}`,
      scenario_id: scenarioId,
      name: incidentName,
      sector_name: sectorName,
      report_ids: reportIds,
      center_lat: avgLat,
      center_lng: avgLng,
      report_count: cluster.length,
      affected_people: affectedPeople,
      medical_cases: medicalCases,
      severity_score: maxSeveritySignal,
      severity_level: severityLevel,
      priority_score: Math.round(priorityScore * 10) / 10,
      status,
      allocation_ids: allocationIds,
      recommended_depot: primaryDepotName || 'Nearest Depot',
      recommended_resources: recommendedResources,
      ground_truth_reasons: reasons,
      created_at: cluster[0]?.created_at || new Date().toISOString(),
    };
  });

  // Sort incidents by priority score descending
  incidents.sort((a, b) => b.priority_score - a.priority_score);

  // 3. Format Active Operations into Human-Facing Missions
  const missions = activeAllocations.map((alloc) => {
    let missionStatus = 'DISPATCHED';
    if (alloc.status === 'confirmed') missionStatus = 'APPROVED';
    if (alloc.status === 'en_route') missionStatus = 'EN_ROUTE';
    if (alloc.status === 'delivered') missionStatus = 'DELIVERED';

    return {
      mission_id: `mis_${alloc.allocation_id}`,
      allocation_id: alloc.allocation_id,
      scenario_id: scenarioId,
      title: `Mission #${alloc.allocation_id}: ${alloc.resource_type.name} to ${alloc.zone.name}`,
      resource_name: alloc.resource_type.name,
      quantity: alloc.quantity,
      unit: alloc.resource_type.unit,
      source_depot: alloc.helping_point.name,
      destination_zone: alloc.zone.name,
      target_lat: alloc.target_lat,
      target_lng: alloc.target_lng,
      status: missionStatus,
      raw_allocation_status: alloc.status,
      updated_at: alloc.updated_at,
    };
  });

  // 4. Compute Summary KPIs for Copilot Header
  const actionRequiredCount = incidents.filter((i) => i.status === 'ACTION_REQUIRED').length;
  const criticalCount = incidents.filter((i) => i.severity_level === 'CRITICAL').length;
  const totalAffected = incidents.reduce((sum, i) => sum + i.affected_people, 0);

  return {
    scenario_id: scenarioId,
    all_clear: incidents.length === 0,
    summary: {
      total_incidents: incidents.length,
      action_required: actionRequiredCount,
      critical_incidents: criticalCount,
      total_affected_citizens: totalAffected,
      active_missions: missions.length,
      monitoring_zones: zones.length,
    },
    incidents,
    missions,
  };
};

export default {
  getIncidentsAndCopilotState,
  DISTANCE_THRESHOLD_METERS,
  TIME_WINDOW_MINUTES,
};
