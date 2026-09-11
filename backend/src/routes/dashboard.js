/**
 * dashboard.js — /api/scenarios/:scenarioId/dashboard (Prisma ORM)
 * Aggregated command-center data in a single call.
 */

import express from 'express';
import prisma from '../config/prisma.js';
import { createError } from '../middleware/errorHandler.js';

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;

    const scenario = await prisma.scenario.findUnique({ where: { scenario_id: scenarioId } });
    if (!scenario) throw createError(404, 'NOT_FOUND', `Scenario "${scenarioId}" not found`);

    const [zones, helpingPoints, activeReports, supplyLines, pendingApprovals, kpiCounts] = await Promise.all([
      // Zones with needs summary
      prisma.zone.findMany({
        where: { scenario_id: scenarioId },
        include: {
          zone_needs: {
            include: { resource_type: { select: { name: true, unit: true } } },
          },
        },
        orderBy: { severity_score: 'desc' },
      }),

      // Helping points with active allocation count
      prisma.helpingPoint.findMany({
        include: {
          inventory: {
            include: { resource_type: { select: { name: true } } },
          },
          allocations: {
            where: { scenario_id: scenarioId, status: { in: ['confirmed', 'en_route'] } },
            select: { allocation_id: true },
          },
        },
        orderBy: { point_id: 'asc' },
      }),

      // Active SOS reports (Red Dots)
      prisma.report.findMany({
        where: { scenario_id: scenarioId, NOT: { verification_status: 'rejected' } },
        select: { report_id: true, lat: true, lng: true, severity_signal: true, verification_status: true, created_at: true, zone: { select: { name: true } } },
        orderBy: { severity_signal: 'desc' },
      }),

      // Supply lines for map (active allocations)
      prisma.allocation.findMany({
        where: { scenario_id: scenarioId, status: { in: ['confirmed', 'en_route'] } },
        select: {
          allocation_id: true, status: true, quantity: true, target_lat: true, target_lng: true,
          helping_point: { select: { lat: true, lng: true } },
          resource_type: { select: { name: true, unit: true } },
        },
      }),

      // Pending approval cards
      prisma.allocation.findMany({
        where: { scenario_id: scenarioId, status: 'proposed' },
        include: {
          helping_point: { select: { name: true } },
          zone:          { select: { name: true } },
          resource_type: { select: { name: true } },
          audit_log:     { orderBy: { created_at: 'desc' }, take: 1, select: { reasoning_text: true } },
        },
        orderBy: { created_at: 'desc' },
      }),

      // KPI counts
      Promise.all([
        prisma.zone.count({ where: { scenario_id: scenarioId } }),
        prisma.zone.count({ where: { scenario_id: scenarioId, severity_level: 'critical' } }),
        prisma.zone.aggregate({ where: { scenario_id: scenarioId }, _sum: { population_estimate: true } }),
        prisma.report.count({ where: { scenario_id: scenarioId, NOT: { verification_status: 'rejected' } } }),
        prisma.allocation.count({ where: { scenario_id: scenarioId } }),
        prisma.allocation.count({ where: { scenario_id: scenarioId, status: 'proposed' } }),
        prisma.allocation.count({ where: { scenario_id: scenarioId, status: 'en_route' } }),
      ]),
    ]);

    const [totalZones, criticalZones, popAgg, activeSOS, totalAllocs, pendingCount, inTransit] = kpiCounts;

    // Format zones with needs summary
    const formattedZones = zones.map((z) => {
      const needs = z.zone_needs;
      return {
        zone_id: z.zone_id, name: z.name,
        center_lat: z.center_lat, center_lng: z.center_lng, radius_m: z.radius_m,
        severity_level: z.severity_level, severity_score: z.severity_score,
        population_estimate: z.population_estimate, status: z.status,
        needs_summary: {
          total_needed: needs.length,
          shortage:  needs.filter((n) => n.fulfillment_status === 'shortage').length,
          balanced:  needs.filter((n) => n.fulfillment_status === 'balanced').length,
          surplus:   needs.filter((n) => n.fulfillment_status === 'surplus').length,
        },
      };
    });

    // Format helping points
    const formattedPoints = helpingPoints.map((p) => {
      const totalStock = p.inventory.reduce((sum, i) => sum + i.total_stock, 0);
      const availStock = p.inventory.reduce((sum, i) => sum + i.available_stock, 0);
      return {
        point_id: p.point_id, name: p.name, type: p.type,
        lat: p.lat, lng: p.lng, status: p.status,
        active_allocations: p.allocations.length,
        utilization_pct: totalStock > 0 ? Math.round((1 - availStock / totalStock) * 1000) / 10 : 0,
      };
    });

    res.json({
      scenario,
      kpi: {
        total_zones:        totalZones,
        critical_zones:     criticalZones,
        affected_population: popAgg._sum.population_estimate ?? 0,
        active_sos_reports: activeSOS,
        system_confidence:  0.94, // Will be computed by ML agent
        total_allocations:  totalAllocs,
        pending_approvals:  pendingCount,
        resources_in_transit: inTransit,
      },
      zones: formattedZones,
      helping_points: formattedPoints,
      active_reports: activeReports.map((r) => ({ ...r, zone_name: r.zone?.name ?? null, zone: undefined })),
      supply_lines: supplyLines.map((a) => ({
        allocation_id: a.allocation_id,
        from_lat: a.helping_point.lat, from_lng: a.helping_point.lng,
        to_lat: a.target_lat, to_lng: a.target_lng,
        resource_name: a.resource_type.name, quantity: a.quantity, status: a.status,
      })),
      pending_approvals: pendingApprovals.map((a) => ({
        allocation_id: a.allocation_id,
        point_name:   a.helping_point.name,
        zone_name:    a.zone.name,
        resource_name: a.resource_type.name,
        quantity:     a.quantity,
        reasoning:    a.audit_log[0]?.reasoning_text ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
