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

const stubProcessReport = (report = {}, scenarioContext = {}) => {
  const zones = scenarioContext.zones || [];
  const points = scenarioContext.helping_points || [];

  // Extract explicit requested resources or fallback keywords
  const explicitResources = (report.needed_resources || report.requested_resources || []).map((r) => String(r).toLowerCase());
  const rawText = (report.raw_text || '').toLowerCase();
  
  const hasMedical = explicitResources.some((r) => r.includes('med')) || rawText.includes('injur') || rawText.includes('med') || rawText.includes('hospital');
  const hasWater = explicitResources.some((r) => r.includes('water')) || rawText.includes('water') || rawText.includes('drink');
  const hasFood = explicitResources.some((r) => r.includes('food')) || rawText.includes('food') || rawText.includes('ration');
  const hasRescue = explicitResources.some((r) => r.includes('rescue') || r.includes('boat') || r.includes('team')) || rawText.includes('trap') || rawText.includes('strand') || rawText.includes('boat');

  // Generate fallback stub allocations across zones if available
  const proposed_allocations = [];
  if (points.length > 0) {
    const targetZoneId = report.zone_id || (zones[0] ? zones[0].zone_id : 1);
    const targetZone = zones.find((z) => z.zone_id === targetZoneId) || zones[0];
    const targetLat = report.lat || (targetZone ? targetZone.center_lat : 18.5204);
    const targetLng = report.lng || (targetZone ? targetZone.center_lng : 73.8567);

    for (const pt of points) {
      const invList = pt.inventory || [];
      for (const inv of invList) {
        const resName = (inv.resource_name || inv.resource_type?.name || '').toLowerCase();
        const resId = inv.resource_id;
        const avail = inv.available_stock || 0;

        let shouldAllocate = false;
        let qty = 0;

        if (hasWater && resName.includes('water') && avail >= 10) {
          shouldAllocate = true;
          qty = Math.min(avail, 100);
        } else if (hasFood && resName.includes('food') && avail >= 10) {
          shouldAllocate = true;
          qty = Math.min(avail, 50);
        } else if (hasMedical && resName.includes('med') && avail >= 5) {
          shouldAllocate = true;
          qty = Math.min(avail, 20);
        } else if (hasRescue && (resName.includes('rescue') || resName.includes('boat')) && avail >= 1) {
          shouldAllocate = true;
          qty = Math.min(avail, 2);
        }

        if (shouldAllocate && qty > 0 && resId) {
          proposed_allocations.push({
            zone_id: targetZoneId,
            point_id: pt.point_id,
            resource_id: resId,
            quantity: qty,
            target_lat: targetLat,
            target_lng: targetLng,
          });
        }
      }
    }

    // If no specific match was made, allocate a default batch from nearest available depot
    if (proposed_allocations.length === 0 && points[0]?.inventory?.length > 0 && points[0].inventory[0]?.resource_id) {
      const defaultPoint = points[0];
      const defaultInv = defaultPoint.inventory[0];
      proposed_allocations.push({
        zone_id: targetZoneId,
        point_id: defaultPoint.point_id,
        resource_id: defaultInv.resource_id,
        quantity: Math.min(defaultInv.available_stock || 25, 25),
        target_lat: targetLat,
        target_lng: targetLng,
      });
    }
  }

  const extractedReqs = [];
  if (hasWater) extractedReqs.push('water');
  if (hasFood) extractedReqs.push('food');
  if (hasMedical) extractedReqs.push('medical');
  if (hasRescue) extractedReqs.push('rescue_team');

  return {
    report_update: {
      report_id: report.report_id,
      extracted_json: {
        incident_type: hasRescue ? 'flood_stranding' : hasMedical ? 'medical_emergency' : 'general_relief',
        stranded_count: hasRescue ? 25 : 0,
        medical_need: hasMedical ? 'high' : 'moderate',
        required_resources: extractedReqs.length ? extractedReqs : ['food', 'water'],
      },
      severity_signal: hasRescue || hasMedical ? 0.85 : 0.65,
      verification_status: 'verified',
    },
    zone_needs_update: [],
    proposed_allocations,
    audit_entries: [
      {
        event_type: 'report_verified',
        agent_name: 'VerificationAgent',
        reasoning_text: `Report #${report.report_id} verified via severity analysis. Score: ${hasRescue || hasMedical ? '0.85 (CRITICAL)' : '0.65 (HIGH)'}.`,
      },
      {
        event_type: 'reallocation_proposed',
        agent_name: 'CoordinatorAgent',
        reasoning_text: `SOS Report #${report.report_id} triggered resource reallocation: ${proposed_allocations.length} proposed allocation(s) dispatched to target location.`,
      },
    ],
    reallocation_diff: null,
  };
};

const stubInitialAllocation = (zones, helpingPoints) => {
  const proposed_allocations = [];
  const zone_needs_updates = [];

  for (const z of zones) {
    const pop = z.population_estimate || 1000;
    const sev = z.severity_score || 0.6;
    
    // Estimate needs
    zone_needs_updates.push(
      { zone_id: z.zone_id, resource_id: 1, quantity_needed: Math.round(pop * 3.0 * sev), fulfillment_status: 'shortage' },
      { zone_id: z.zone_id, resource_id: 2, quantity_needed: Math.round(pop * 0.5 * sev), fulfillment_status: 'shortage' },
      { zone_id: z.zone_id, resource_id: 3, quantity_needed: Math.round(pop * 0.02 * sev), fulfillment_status: 'shortage' }
    );

    // Initial allocations from helping points if stock exists
    if (helpingPoints && helpingPoints.length > 0) {
      for (const pt of helpingPoints.slice(0, 2)) {
        for (const inv of (pt.inventory || []).slice(0, 2)) {
          if ((inv.available_stock || 0) > 20) {
            proposed_allocations.push({
              zone_id: z.zone_id,
              point_id: pt.point_id,
              resource_id: inv.resource_id,
              quantity: Math.min(Math.round(inv.available_stock * 0.25), 50),
              target_lat: z.center_lat,
              target_lng: z.center_lng,
            });
          }
        }
      }
    }
  }

  return {
    proposed_allocations,
    zone_needs_updates,
    audit_entries: [
      {
        event_type: 'allocation_proposed',
        agent_name: 'CoordinatorAgent',
        reasoning_text: `Initial multi-zone resource allocation computed across ${zones.length} zones and ${helpingPoints.length} depots.`,
      },
    ],
  };
};

const stubTick = (simTime) => ({
  severity_updates: [],
  new_allocations: [],
  audit_entries: [
    {
      event_type: 'simulation_tick',
      agent_name: 'system',
      reasoning_text: `Simulation advanced to ${simTime}. Inventory refreshed and telemetry synced.`,
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
  if (IS_STUB) return stubProcessReport(report, scenarioContext);

  try {
    const { data } = await client.post('/ml/process-report', { report, scenario_context: scenarioContext });
    return data;
  } catch (err) {
    console.error('❌ [ML] processReport failed:', err.message);
    console.warn('   Falling back to stub response with scenario context');
    return stubProcessReport(report, scenarioContext);
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

/**
 * Run standalone YOLO visual intelligence analysis on an emergency field image.
 */
const analyzeVision = async (imageInput, confidenceThreshold = 0.40) => {
  try {
    const { data } = await client.post('/vision/analyze', {
      image_input: imageInput,
      confidence_threshold: confidenceThreshold,
    });
    return data;
  } catch (err) {
    console.error('⚠️ [ML Client] analyzeVision call failed:', err.message);
    return {
      success: false,
      error: err.message,
      detections: [],
    };
  }
};

export { processReport, initialAllocation, tick, healthCheck, analyzeVision };
export default { processReport, initialAllocation, tick, healthCheck, analyzeVision };

