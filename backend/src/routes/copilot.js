/**
 * copilot.js — /api/scenarios/:scenarioId/copilot routes
 *
 * REST endpoints for the RESQ Response Copilot and Gemini AI Reasoning.
 */

import express from 'express';
import { createError } from '../middleware/errorHandler.js';
import { getIncidentsAndCopilotState } from '../services/responseCopilotService.js';
import { analyzeIncidentWithGemini } from '../services/geminiService.js';

const router = express.Router({ mergeParams: true });

// ── GET /api/scenarios/:scenarioId/copilot ───────────────────
router.get('/', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const copilotData = await getIncidentsAndCopilotState(scenarioId);

    // Enrich top actionable incident with Gemini AI Brief
    if (copilotData.incidents && copilotData.incidents.length > 0) {
      const topIncident = copilotData.incidents[0];
      const compactContext = {
        scenario_id: scenarioId,
        incident: {
          name: topIncident.name,
          sector_name: topIncident.sector_name,
          report_count: topIncident.report_count,
          affected_people: topIncident.affected_people,
          medical_cases: topIncident.medical_cases,
          location: { lat: topIncident.center_lat, lng: topIncident.center_lng },
        },
        assessment: {
          severity_level: topIncident.severity_level,
          severity_score: topIncident.severity_score,
        },
        recommendation: {
          depot: topIncident.recommended_depot,
          resources: topIncident.recommended_resources,
        },
        system_reasons: topIncident.ground_truth_reasons,
      };

      topIncident.ai_brief = await analyzeIncidentWithGemini(compactContext);
    }

    res.json(copilotData);
  } catch (err) {
    if (err.message.includes('not found')) {
      return next(createError(404, 'NOT_FOUND', err.message));
    }
    next(err);
  }
});

// ── POST /api/scenarios/:scenarioId/copilot/analyze ──────────
router.post('/analyze', async (req, res, next) => {
  try {
    const { scenarioId } = req.params;
    const { incident } = req.body;

    if (!incident) {
      throw createError(400, 'VALIDATION_ERROR', 'incident payload is required');
    }

    const compactContext = {
      scenario_id: scenarioId,
      incident: {
        name: incident.name,
        sector_name: incident.sector_name,
        report_count: incident.report_count,
        affected_people: incident.affected_people,
        medical_cases: incident.medical_cases,
        location: { lat: incident.center_lat, lng: incident.center_lng },
      },
      assessment: {
        severity_level: incident.severity_level,
        severity_score: incident.severity_score,
      },
      recommendation: {
        depot: incident.recommended_depot,
        resources: incident.recommended_resources,
      },
      system_reasons: incident.ground_truth_reasons || [],
    };

    const aiBrief = await analyzeIncidentWithGemini(compactContext);
    res.json(aiBrief);
  } catch (err) {
    next(err);
  }
});

export default router;
