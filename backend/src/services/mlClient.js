/**
 * mlClient.js — FastAPI ML Service HTTP Client
 *
 * Wraps all calls to the Python FastAPI ML service.
 * Currently STUBBED — returns mock responses so the Node.js backend
 * can be tested independently before the ML service is built.
 *
 * To switch from stub to live: set ML_STUB=false in .env
 * and the functions will call the real FastAPI endpoints.
 */

import axios from 'axios';

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const IS_STUB = process.env.ML_STUB !== 'false';

if (IS_STUB) {
  console.log('⚠️  [ML] Running in STUB mode — ML calls return mock responses');
}

const client = axios.create({
  baseURL: ML_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ──────────────────────────────────────────────────────────────
// STUB HELPERS
// ──────────────────────────────────────────────────────────────

const stubProcessReport = (report) => ({
  report_update: {
    report_id: report.report_id,
    extracted_json: {
      incident_type: 'flood_stranding',
      stranded_count: 35,
      medical_need: 'high',
      required_resources: [
        { resource: 'rescue_team', min_qty: 2 },
        { resource: 'medical', min_qty: 40 },
      ],
    },
    severity_signal: 0.75,
    verification_status: 'verified',
  },
  zone_needs_update: [],
  proposed_allocations: [],
  audit_entries: [
    {
      event_type: 'report_verified',
      agent_name: 'VerificationAgent',
      reasoning_text: '[STUB] Report verified. No duplicate detected within 500m/30min window.',
    },
    {
      event_type: 'needs_assessed',
      agent_name: 'NeedsAgent',
      reasoning_text: '[STUB] Assessed needs: 2 rescue teams, 40 medical kits for stranded population.',
    },
  ],
  reallocation_diff: null,
});

const stubInitialAllocation = (zones, helpingPoints) => ({
  proposed_allocations: [],
  zone_needs_updates: zones.map((z) => ({ zone_id: z.zone_id, severity_score: 0.5, severity_level: 'moderate' })),
  audit_entries: [
    {
      event_type: 'allocation_proposed',
      agent_name: 'CoordinatorAgent',
      reasoning_text: '[STUB] Initial allocation computed. OR-Tools solver will be wired in next phase.',
    },
  ],
});

const stubTick = (simTime) => ({
  severity_updates: [],
  new_allocations: [],
  audit_entries: [
    {
      event_type: 'simulation_tick',
      agent_name: 'system',
      reasoning_text: `[STUB] Simulation advanced to ${simTime}. Forecasting agent pending ML integration.`,
    },
  ],
});

// ──────────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────────

/**
 * Run the full agent pipeline on a new SOS report.
 */
const processReport = async (report, scenarioContext) => {
  if (IS_STUB) return stubProcessReport(report);

  try {
    const { data } = await client.post('/ml/process-report', { report, scenario_context: scenarioContext });
    return data;
  } catch (err) {
    console.error('❌ [ML] processReport failed:', err.message);
    console.warn('   Falling back to stub response');
    return stubProcessReport(report);
  }
};

/**
 * Run initial allocation when simulation starts.
 */
const initialAllocation = async (scenarioId, zones, helpingPoints) => {
  if (IS_STUB) return stubInitialAllocation(zones, helpingPoints);

  try {
    const { data } = await client.post('/ml/initial-allocation', { scenario_id: scenarioId, zones, helping_points: helpingPoints });
    return data;
  } catch (err) {
    console.error('❌ [ML] initialAllocation failed:', err.message);
    console.warn('   Falling back to stub response');
    return stubInitialAllocation(zones, helpingPoints);
  }
};

/**
 * Run agent analysis for a time-step tick.
 */
const tick = async (scenarioId, newSimTime, currentState) => {
  if (IS_STUB) return stubTick(newSimTime);

  try {
    const { data } = await client.post('/ml/tick', {
      scenario_id: scenarioId,
      new_sim_time: newSimTime,
      current_state: currentState,
    });
    return data;
  } catch (err) {
    console.error('❌ [ML] tick failed:', err.message);
    console.warn('   Falling back to stub response');
    return stubTick(newSimTime);
  }
};

/**
 * Health check — verify ML service is reachable.
 */
const healthCheck = async () => {
  if (IS_STUB) return { status: 'stub', message: 'ML service is stubbed' };

  try {
    const { data } = await client.get('/ml/health');
    return data;
  } catch (err) {
    return { status: 'unavailable', error: err.message };
  }
};

export { processReport, initialAllocation, tick, healthCheck };
export default { processReport, initialAllocation, tick, healthCheck };
