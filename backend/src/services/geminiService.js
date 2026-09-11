/**
 * geminiService.js — Backend Gemini AI Service for RESQ Response Copilot
 *
 * Provides Gemini-powered natural language summaries, AI triage classification,
 * and explainable grounding for existing RESQ recommendations.
 *
 * SECURITY CONTRACT:
 * - GEMINI_API_KEY is backend-only (read from process.env).
 * - Key is NEVER sent to frontend, logged, or returned in API payloads.
 *
 * AUTHORITATIVE RULE:
 * - Gemini provides explanation and reasoning ONLY.
 * - Gemini NEVER modifies severity scores, allocations, or database records.
 * - Strict fallback to system reasoning on missing key, timeout, or API error.
 * - Local caching ensures requests for a scenario ID reuse saved LLM responses without hitting external APIs redundantly.
 */

import { GoogleGenAI } from '@google/genai';
import prisma from '../config/prisma.js';

const GEMINI_TIMEOUT_MS = 6000;

// Local host in-memory cache for LLM responses keyed by scenario & incident ID
const llmResponseCache = new Map();

/**
 * Generate cache key for a given incident context.
 */
const getCacheKey = (context) => {
  const scenarioId = context.scenario_id || 'default_scenario';
  const incidentId = context.incident?.incident_id || context.incident?.name || 'incident_cluster';
  const reportCount = context.incident?.report_count || 0;
  return `${scenarioId}:${incidentId}:${reportCount}`;
};

/**
 * Helper to build safe fallback response when Gemini is unavailable or fails.
 */
const getFallbackAnalysis = (context, reason = 'API key unavailable') => {
  const incident = context.incident || {};
  const assessment = context.assessment || {};
  const recommendation = context.recommendation || {};

  return {
    ai_available: false,
    fallback_reason: reason,
    incident_summary: `${incident.report_count || 1} SOS field report(s) indicate an emergency situation in ${
      incident.sector_name || 'the sector'
    }. ${incident.affected_people || 5} citizens may be affected.`,
    incident_type: incident.medical_cases > 0 ? 'MEDICAL_EMERGENCY' : 'FLOODING',
    urgency_explanation: `ML Severity score: ${(assessment.severity_score || 0.5).toFixed(2)} (${
      assessment.severity_level || 'HIGH'
    }).`,
    response_explanation: `RESQ solver selected response assets from ${
      recommendation.depot || 'nearest available depot'
    } to address reported needs.`,
    key_factors: context.system_reasons || [],
    model_used: 'system_fallback',
  };
};

/**
 * Clear cache for a specific scenario or all scenarios.
 */
export const clearLlmCache = (scenarioId = null) => {
  if (!scenarioId) {
    llmResponseCache.clear();
    console.log('🧹 [Gemini Cache] Cleared all local LLM response caches');
    return;
  }
  for (const key of llmResponseCache.keys()) {
    if (key.startsWith(`${scenarioId}:`)) {
      llmResponseCache.delete(key);
    }
  }
  console.log(`🧹 [Gemini Cache] Cleared local LLM response cache for scenario '${scenarioId}'`);
};

/**
 * Main service method to analyze an incident with Gemini AI with Local Caching.
 */
export const analyzeIncidentWithGemini = async (context) => {
  const cacheKey = getCacheKey(context);

  // 1. Check if LLM response exists in local host cache
  if (llmResponseCache.has(cacheKey)) {
    console.log(`⚡ [Gemini Service] Returning cached local LLM response for '${cacheKey}' (API request skipped)`);
    return llmResponseCache.get(cacheKey);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey || !apiKey.trim()) {
    console.log('ℹ️ [Gemini Service] GEMINI_API_KEY not configured — using deterministic fallback reasoning');
    const fallbackResult = getFallbackAnalysis(context, 'GEMINI_API_KEY missing');
    llmResponseCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an AI assistant for a disaster-response command center (RESQ).
Your task is to summarize the emergency incident and explain the existing resource recommendation.

STRICT GROUNDING & ANTI-HALLUCINATION RULES:
1. Use ONLY the facts provided in the JSON input context.
2. Do NOT invent people, medical cases, resources, locations, inventory, severity scores, or operational details.
3. Do NOT change, recalculate, or override the provided severity score or resource allocations.
4. Do NOT recommend resources that are not listed in the recommendation input.
5. Provide concise, clear command-center wording suitable for an emergency commander.

Respond strictly with a JSON object matching this schema:
{
  "incident_summary": "Concise 2-sentence command-center situation summary.",
  "incident_type": "FLOODING" | "MEDICAL_EMERGENCY" | "STRANDED_CIVILIANS" | "EVACUATION" | "INFRASTRUCTURE_FAILURE" | "MULTI_HAZARD" | "UNKNOWN",
  "urgency_explanation": "Concise explanation of urgency grounded strictly in supplied metrics.",
  "response_explanation": "Concise explanation of why the supplied recommendation is appropriate.",
  "key_factors": ["Factor 1", "Factor 2", "Factor 3"]
}`;

    const prompt = `INCOMING INCIDENT CONTEXT FOR TRIAGE & EXPLANATION:
${JSON.stringify(context, null, 2)}`;

    // Set timeout using Promise.race
    const apiPromise = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out')), GEMINI_TIMEOUT_MS)
    );

    const response = await Promise.race([apiPromise, timeoutPromise]);
    const responseText = response.text || '';

    let parsed = JSON.parse(responseText);

    // Sanity check structured outputs
    if (!parsed.incident_summary || !parsed.response_explanation) {
      throw new Error('Gemini output missing required structured fields');
    }

    // Log Audit Trail Entry for AI Analysis
    if (context.scenario_id) {
      await prisma.auditLog.create({
        data: {
          scenario_id: context.scenario_id,
          event_type: 'AI_BRIEF_GENERATED',
          agent_name: 'GeminiAgent',
          reasoning_text: `Gemini AI Brief generated for incident '${context.incident?.name || 'Emergency Cluster'}'. Type: ${parsed.incident_type}.`,
        },
      }).catch(() => {});
    }

    const aiResult = {
      ai_available: true,
      incident_summary: parsed.incident_summary,
      incident_type: parsed.incident_type || 'FLOODING',
      urgency_explanation: parsed.urgency_explanation,
      response_explanation: parsed.response_explanation,
      key_factors: Array.isArray(parsed.key_factors) ? parsed.key_factors : (context.system_reasons || []),
      model_used: modelName,
    };

    // 2. Save LLM response in local host cache for this scenario & incident
    llmResponseCache.set(cacheKey, aiResult);
    console.log(`💾 [Gemini Service] Cached local LLM response for scenario '${context.scenario_id}' (${cacheKey})`);

    return aiResult;
  } catch (err) {
    console.warn(`⚠️ [Gemini Service] Gemini AI call failed/timed out: ${err.message} — falling back cleanly`);
    const fallbackResult = getFallbackAnalysis(context, err.message);
    llmResponseCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }
};

export default {
  analyzeIncidentWithGemini,
  clearLlmCache,
};

