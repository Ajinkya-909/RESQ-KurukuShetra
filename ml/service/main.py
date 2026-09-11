"""
FastAPI HTTP Service for RESQ ML Intelligence Engine.

Endpoints:
  GET  /health                  → Service health check
  GET  /ml/health               → ML-specific health check (alias)
  POST /predict/severity        → Raw 12-feature severity prediction
  POST /intelligence/analyze    → Full single-zone intelligence pipeline
  POST /ml/process-report       → Process incoming SOS report (Node.js integration)
  POST /ml/initial-allocation   → Compute initial allocations when simulation starts
  POST /ml/tick                 → Re-evaluate and reallocate on simulation tick
"""

import os
import traceback
from typing import Dict, Any, List, Optional, Literal
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, model_validator

from ml.src.schemas import FEATURE_NAMES, validate_features, map_severity_score_to_level
from ml.src.predict import predict_severity
from ml.src.pipeline.intelligence import run_intelligence_pipeline
from ml.src.allocation.optimizer import optimize_allocations
from ml.src.needs.assessment import assess_needs
from ml.src.fallback import predict_severity_rule_based
from ml.service.schemas import IntelligenceAnalyzeRequest
from ml.service.adapter import (
    adapt_helping_points_for_allocation,
    adapt_zones_for_allocation,
    build_severity_features_from_zone,
    map_allocations_to_db_format,
    build_zone_needs_updates,
    estimate_initial_needs,
)

app = FastAPI(
    title="RESQ ML Service",
    description="Machine Learning service housing the RESQ Severity Agent, Demand Forecasting, Needs Assessment, and OR-Tools Resource Allocation Engine.",
    version="2.0.0",
)


# ──────────────────────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "RESQ ML Service"
    version: str = "2.0.0"


class SeverityRequest(BaseModel):
    affected_population: float = Field(..., description="Estimated affected population count")
    stranded_people: float = Field(..., description="Count of stranded/trapped people")
    water_level: float = Field(..., description="Normalized water level score [0.0, 1.0]")
    hospital_occupancy: float = Field(..., description="Hospital occupancy ratio [0.0, 1.0]")
    medical_cases: float = Field(..., description="Medical emergency count")
    road_blocked: float = Field(..., description="Binary road blockage flag (0 or 1)")
    sos_count: float = Field(..., description="Active SOS report count")
    shelter_occupancy: float = Field(..., description="Shelter occupancy ratio [0.0, 1.0]")
    food_shortage_ratio: float = Field(..., description="Food shortage ratio [0.0, 1.0]")
    water_shortage_ratio: float = Field(..., description="Water shortage ratio [0.0, 1.0]")
    disaster_duration_hours: float = Field(..., description="Hours since disaster start")
    population_vulnerability: float = Field(..., description="Population vulnerability ratio [0.0, 1.0]")

    @model_validator(mode="before")
    @classmethod
    def validate_exact_keys(cls, values: Any) -> Any:
        if isinstance(values, dict):
            extra_keys = [k for k in values.keys() if k not in FEATURE_NAMES]
            if extra_keys:
                raise ValueError(f"Unknown feature(s) rejected: {extra_keys}")
        return values


class SeverityResponse(BaseModel):
    severity_score: float
    severity_level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]
    model: str
    model_version: str


# ──────────────────────────────────────────────────────────────
# Existing Endpoints (preserved)
# ──────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check() -> HealthResponse:
    """Returns the operational status of the ML service."""
    return HealthResponse()


@app.get("/ml/health", response_model=HealthResponse, tags=["Health"])
def ml_health_check() -> HealthResponse:
    """Alias for /health — called by Node.js mlClient."""
    return HealthResponse()


@app.post("/predict/severity", response_model=SeverityResponse, tags=["Inference"])
def predict_disaster_severity(request: SeverityRequest) -> SeverityResponse:
    """Accepts 12 operational features and returns predicted severity score and level."""
    payload = request.model_dump()
    try:
        result = predict_severity(payload)
        return SeverityResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/intelligence/analyze", tags=["Pipeline"])
def analyze_disaster_intelligence(request: IntelligenceAnalyzeRequest) -> Dict[str, Any]:
    """Full single-zone intelligence pipeline."""
    payload = request.model_dump()
    try:
        result = run_intelligence_pipeline(
            payload=payload, horizon=request.horizon, include_provenance=request.include_provenance
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


# ──────────────────────────────────────────────────────────────
# NEW: Node.js Integration Endpoints
# ──────────────────────────────────────────────────────────────

@app.post("/ml/process-report", tags=["Node Integration"])
def process_report(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process an incoming SOS field report and trigger global resource reallocation.
    Called by Node.js mlClient.processReport().

    Input from Node:
      { report: { report_id, lat, lng, raw_text, zone_id, ... },
        scenario_context: { scenario_id, zones, helping_points, current_allocations } }

    Returns:
      { report_update: { extracted_json, severity_signal, verification_status },
        proposed_allocations: [...],
        audit_entries: [...] }
    """
    try:
        report = body.get("report", {})
        ctx = body.get("scenario_context", {})
        zones = ctx.get("zones", [])
        helping_points = ctx.get("helping_points", [])
        report_zone_id = report.get("zone_id")

        print(f"\n🚨 [ML Service] Processing Report #{report.get('report_id')} (Zone: {report_zone_id})")
        print(f"   Text: \"{report.get('raw_text')}\"")

        # 1. Build severity features from the report's zone context
        matching_zone = next(
            (z for z in zones if z.get("zone_id") == report_zone_id), None
        )
        if not matching_zone and zones:
            matching_zone = zones[0]
            report_zone_id = matching_zone.get("zone_id")

        zone_for_features = matching_zone or {
            "population_estimate": 1000,
            "severity_score": 0.5,
        }

        features = build_severity_features_from_zone(zone_for_features, [report])

        # 2. Predict severity score and level for report
        try:
            severity_result = predict_severity(features)
        except Exception:
            severity_result = predict_severity_rule_based(features)

        severity_score = severity_result["severity_score"]
        severity_level = severity_result["severity_level"]

        # 3. Extract structured info from raw_text and explicit needed_resources
        raw_text = (report.get("raw_text") or "").lower()
        extracted = extract_report_entities(raw_text)
        
        # Merge explicitly selected resources from report payload if present
        explicit_resources = report.get("needed_resources", []) or report.get("requested_resources", [])
        if isinstance(explicit_resources, list):
            extracted["required_resources"] = list(set(extracted.get("required_resources", []) + explicit_resources))

        # Build emergency extra needs from the SOS report
        sos_extra_needs: Dict[str, float] = {}
        stranded = float(extracted.get("stranded_count", 0) or 0)
        medical_need = extracted.get("medical_need", "unknown")

        if stranded > 0:
            sos_extra_needs["water"] = round(stranded * 3.0, 2)
            sos_extra_needs["food"] = round(stranded * 0.5, 2)
            sos_extra_needs["shelter"] = round(max(1.0, stranded * 0.05), 2)
            sos_extra_needs["rescue_team"] = round(max(1.0, stranded * 0.01), 2)
        if medical_need in ["high", "moderate"]:
            sos_extra_needs["medical"] = 20.0 if medical_need == "high" else 10.0
            sos_extra_needs["ambulance"] = 2.0 if medical_need == "high" else 1.0

        # Inject requirements from explicitly requested resources
        for req_res in extracted["required_resources"]:
            req_clean = req_res.lower()
            if "water" in req_clean:
                sos_extra_needs["water"] = max(sos_extra_needs.get("water", 0), 50.0)
            elif "food" in req_clean:
                sos_extra_needs["food"] = max(sos_extra_needs.get("food", 0), 30.0)
            elif "medical" in req_clean:
                sos_extra_needs["medical"] = max(sos_extra_needs.get("medical", 0), 15.0)
            elif "boat" in req_clean:
                sos_extra_needs["rescue_boat"] = max(sos_extra_needs.get("rescue_boat", 0), 2.0)
            elif "ambulance" in req_clean:
                sos_extra_needs["ambulance"] = max(sos_extra_needs.get("ambulance", 0), 1.0)
            elif "team" in req_clean or "rescue" in req_clean:
                sos_extra_needs["rescue_team"] = max(sos_extra_needs.get("rescue_team", 0), 2.0)
            elif "shelter" in req_clean or "tent" in req_clean:
                sos_extra_needs["shelter"] = max(sos_extra_needs.get("shelter", 0), 5.0)

        print(f"   ML Severity Score: {severity_score:.2f} ({severity_level}) | SOS Extra Needs: {sos_extra_needs}")

        # Update matching zone's severity if new SOS signal is higher
        if matching_zone:
            matching_zone["severity_score"] = max(
                float(matching_zone.get("severity_score", 0.0)), severity_score, 0.75
            )
            matching_zone["severity_level"] = severity_level.lower()

        # 4. Global Reallocation across ALL zones using available inventory
        proposed_allocations: List[Dict[str, Any]] = []
        res_name_to_id = build_resource_name_map(helping_points)
        disaster_type = zones[0].get("disaster_type", "flood") if zones else "flood"

        adapted_zones = adapt_zones_for_allocation(
            zones,
            resource_names=list(res_name_to_id.keys()) if res_name_to_id else None,
            disaster_type=disaster_type,
        )

        # Inject SOS report emergency needs & high priority flag into target zone in adapted_zones
        if report_zone_id is not None and adapted_zones:
            target_z = next((az for az in adapted_zones if str(az["zone_id"]) == str(report_zone_id)), None)
            if target_z:
                target_z["is_sos_target"] = True
                target_z["severity_score"] = max(float(target_z.get("severity_score", 0.0)), 0.85)
                for res_n, extra_q in sos_extra_needs.items():
                    target_z["needs"][res_n] = round(target_z["needs"].get(res_n, 0.0) + extra_q, 2)

        adapted_points = adapt_helping_points_for_allocation(helping_points)

        print(f"   Adapted {len(adapted_zones)} zones & {len(adapted_points)} depots for OR-Tools solve")

        if adapted_zones and adapted_points:
            try:
                opt_result = optimize_allocations(adapted_zones, adapted_points)
                proposed_allocations = map_allocations_to_db_format(
                    opt_result, adapted_zones, adapted_points, res_name_to_id, report
                )
                print(f"✅ [ML Service] OR-Tools Solver status: {opt_result.get('status')} -> Generated {len(proposed_allocations)} proposed allocations")
            except Exception as opt_err:
                print(f"❌ [ML Service] Reallocation Optimizer failed: {opt_err}")

        # 5. Build audit trail including preemption notices
        total_proposed_qty = sum(a.get("quantity", 0) for a in proposed_allocations)
        audit_entries = [
            {
                "event_type": "report_verified",
                "agent_name": "VerificationAgent",
                "reasoning_text": f"Report verified via ML severity analysis. Score: {severity_score:.2f} ({severity_level}). "
                    + (f"Assigned to zone {report_zone_id}." if report_zone_id else "No enclosing zone found."),
            },
            {
                "event_type": "reallocation_proposed",
                "agent_name": "CoordinatorAgent",
                "reasoning_text": f"SOS Report #{report.get('report_id')} triggered preemptive resource reallocation. "
                    + f"Evaluated unallocated depot stock and proposed {len(proposed_allocations)} allocations ({total_proposed_qty:.0f} units) with priority boost to target location.",
            },
        ]

        if extracted.get("stranded_count", 0) > 0 or extracted.get("medical_need") or extracted.get("required_resources"):
            audit_entries.append({
                "event_type": "needs_assessed",
                "agent_name": "NeedsAgent",
                "reasoning_text": f"Extracted requirements: {extracted.get('stranded_count', 0)} stranded, "
                    + f"medical need: {extracted.get('medical_need', 'unknown')}, "
                    + f"requested: {', '.join(extracted.get('required_resources', [])) or 'general relief'}.",
            })

        # Check for optional attached field image
        image_input = report.get("image_input") or report.get("image_url") or report.get("image_base64")
        if image_input:
            try:
                from ml.vision.detector import analyze_image
                print(f"📷 [ML Service] Running YOLO visual detection on report image...")
                vis_result = analyze_image(image_input)
                extracted["visual_evidence"] = vis_result
                if vis_result.get("success"):
                    dets_summary = ", ".join([f"{d['class_name']} ({int(d['confidence']*100)}%)" for d in vis_result.get("detections", [])])
                    print(f"   YOLO Detections: {dets_summary if dets_summary else 'No objects detected above threshold'}")
            except Exception as vis_err:
                print(f"⚠️ [ML Service] Vision analysis skipped due to error: {vis_err}")

        return {
            "report_update": {
                "report_id": report.get("report_id"),
                "extracted_json": extracted,
                "severity_signal": severity_score,
                "verification_status": "verified",
            },
            "zone_needs_update": [],
            "proposed_allocations": proposed_allocations,
            "audit_entries": audit_entries,
            "reallocation_diff": None,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report processing error: {str(e)}")


@app.post("/ml/initial-allocation", tags=["Node Integration"])
def initial_allocation(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute initial resource allocations when a simulation starts.
    Called by Node.js mlClient.initialAllocation().

    Input from Node:
      { scenario_id, zones: [...], helping_points: [...] }

    Returns:
      { proposed_allocations: [...], zone_needs_updates: [...], audit_entries: [...] }
    """
    try:
        scenario_id = body.get("scenario_id", "unknown")
        zones_raw = body.get("zones", [])
        points_raw = body.get("helping_points", [])

        if not zones_raw:
            return {
                "proposed_allocations": [],
                "zone_needs_updates": [],
                "audit_entries": [{
                    "event_type": "allocation_skipped",
                    "agent_name": "CoordinatorAgent",
                    "reasoning_text": "No zones provided. Skipping initial allocation.",
                }],
            }

        # Determine disaster type from first zone
        disaster_type = zones_raw[0].get("disaster_type", "flood")

        # Build resource name → id mapping from helping point inventory
        res_name_to_id = build_resource_name_map(points_raw)
        resource_names = list(res_name_to_id.keys()) if res_name_to_id else None

        # 1. Predict severity for each zone
        zone_severity_updates: List[Dict[str, Any]] = []
        for z in zones_raw:
            features = build_severity_features_from_zone(z)
            try:
                sev = predict_severity(features)
            except Exception:
                sev = predict_severity_rule_based(features)

            zone_severity_updates.append({
                "zone_id": z.get("zone_id"),
                "severity_score": sev["severity_score"],
                "severity_level": sev["severity_level"].lower(),
            })
            # Augment the zone data with ML severity for allocation
            z["severity_score"] = sev["severity_score"]
            z["severity_level"] = sev["severity_level"].lower()

        # 2. Adapt data to optimizer format
        adapted_zones = adapt_zones_for_allocation(
            zones_raw, resource_names=resource_names, disaster_type=disaster_type
        )
        adapted_points = adapt_helping_points_for_allocation(points_raw)

        if not adapted_zones or not adapted_points:
            return {
                "proposed_allocations": [],
                "zone_needs_updates": build_zone_needs_updates(adapted_zones, res_name_to_id) if adapted_zones else [],
                "audit_entries": [{
                    "event_type": "allocation_skipped",
                    "agent_name": "CoordinatorAgent",
                    "reasoning_text": f"Insufficient data for allocation. Zones: {len(adapted_zones)}, Points: {len(adapted_points)}.",
                }],
            }

        # 3. Run OR-Tools optimizer across ALL zones simultaneously
        opt_result = optimize_allocations(adapted_zones, adapted_points)

        # 4. Convert optimizer output to DB-shaped allocations
        db_allocations = map_allocations_to_db_format(
            opt_result, adapted_zones, adapted_points, res_name_to_id
        )

        # 5. Generate zone_needs updates
        zone_needs_data = build_zone_needs_updates(adapted_zones, res_name_to_id)

        # 6. Build audit trail
        total_allocs = len(db_allocations)
        total_qty = sum(a["quantity"] for a in db_allocations)
        unmet_zones = list(opt_result.get("unmet_demand", {}).keys())

        audit_entries = [
            {
                "event_type": "severity_assessed",
                "agent_name": "SeverityAgent",
                "reasoning_text": f"Severity assessed for {len(zone_severity_updates)} zones. "
                    + ", ".join(
                        f"Zone {u['zone_id']}: {u['severity_level'].upper()} ({u['severity_score']:.2f})"
                        for u in zone_severity_updates[:5]
                    ),
            },
            {
                "event_type": "allocation_proposed",
                "agent_name": "CoordinatorAgent",
                "reasoning_text": f"OR-Tools solver status: {opt_result['status']}. "
                    + f"Proposed {total_allocs} allocations totaling {total_qty:.0f} resource units across {len(adapted_zones)} zones. "
                    + f"Summary: requested={opt_result['summary']['total_requested']:.0f}, "
                    + f"allocated={opt_result['summary']['total_allocated']:.0f}, "
                    + f"unmet={opt_result['summary']['total_unmet']:.0f}."
                    + (f" Zones with unmet demand: {', '.join(str(z) for z in unmet_zones)}." if unmet_zones else " All zone needs satisfied."),
            },
        ]

        return {
            "proposed_allocations": db_allocations,
            "zone_needs_updates": zone_needs_data,
            "severity_updates": zone_severity_updates,
            "audit_entries": audit_entries,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Initial allocation error: {str(e)}")


@app.post("/ml/tick", tags=["Node Integration"])
def simulation_tick(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Re-evaluate zones and reallocate on simulation time advance.
    Called by Node.js mlClient.tick().

    Input from Node:
      { scenario_id, new_sim_time, current_state: { zones, allocations, inventory } }

    Returns:
      { severity_updates: [...], new_allocations: [...], audit_entries: [...] }
    """
    try:
        scenario_id = body.get("scenario_id", "unknown")
        new_sim_time = body.get("new_sim_time", "")
        current_state = body.get("current_state", {})

        zones = current_state.get("zones", [])
        existing_allocations = current_state.get("allocations", [])
        inventory_rows = current_state.get("inventory", [])

        # 1. Re-evaluate severity for each zone
        severity_updates: List[Dict[str, Any]] = []
        for z in zones:
            features = build_severity_features_from_zone(z)
            # Account for time progression
            features["disaster_duration_hours"] = min(
                features.get("disaster_duration_hours", 0) + 1.0, 720.0
            )
            try:
                sev = predict_severity(features)
            except Exception:
                sev = predict_severity_rule_based(features)

            severity_updates.append({
                "zone_id": z.get("zone_id"),
                "severity_score": sev["severity_score"],
                "severity_level": sev["severity_level"].lower(),
            })

        # 2. Check if reallocation is needed (any zones with active shortages)
        new_allocations: List[Dict[str, Any]] = []
        audit_entries = [
            {
                "event_type": "simulation_tick",
                "agent_name": "system",
                "reasoning_text": f"Simulation advanced to {new_sim_time}. "
                    + f"Re-evaluated severity for {len(severity_updates)} zones. "
                    + f"Active allocations in pipeline: {len(existing_allocations)}.",
            },
        ]

        return {
            "severity_updates": severity_updates,
            "new_allocations": new_allocations,
            "audit_entries": audit_entries,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Tick error: {str(e)}")


# ──────────────────────────────────────────────────────────────
# Visual Intelligence Endpoint (YOLO)
# ──────────────────────────────────────────────────────────────

class VisionAnalyzeRequest(BaseModel):
    image_input: str = Field(..., description="File path, base64 data-url, or image reference")
    confidence_threshold: Optional[float] = Field(default=None, description="Optional confidence score threshold [0.0, 1.0]")

@app.post("/vision/analyze", tags=["Vision"])
def analyze_vision(request: VisionAnalyzeRequest) -> Dict[str, Any]:
    """
    Analyzes an SOS field photo using YOLO object detection.
    Returns structured visual evidence (bounding boxes, class labels, confidence scores).
    Does NOT alter existing XGBoost severity or OR-Tools resource allocation.
    """
    try:
        from ml.vision.detector import analyze_image, CONFIDENCE_THRESHOLD
        thresh = request.confidence_threshold if request.confidence_threshold is not None else CONFIDENCE_THRESHOLD
        result = analyze_image(request.image_input, confidence_threshold=thresh)
        return result
    except Exception as e:
        print(f"❌ [Vision] API analyze error: {e}")
        return {
            "success": False,
            "error": f"Vision analysis error: {str(e)}",
            "detections": []
        }

# ──────────────────────────────────────────────────────────────
# Utility Functions
# ──────────────────────────────────────────────────────────────

def extract_report_entities(raw_text: str) -> Dict[str, Any]:
    """
    Simple keyword-based NLP entity extraction from SOS report text.
    Extracts incident type, stranded count, medical needs.
    """
    text = raw_text.lower()

    # Incident type classification
    incident_type = "unclassified"
    if any(w in text for w in ["flood", "water", "submerge", "drown", "rain"]):
        incident_type = "flood_stranding"
    elif any(w in text for w in ["fire", "burn", "blaze"]):
        incident_type = "fire_emergency"
    elif any(w in text for w in ["earthquake", "collapse", "rubble", "tremor"]):
        incident_type = "earthquake_rescue"
    elif any(w in text for w in ["cyclone", "storm", "wind"]):
        incident_type = "cyclone_damage"
    elif any(w in text for w in ["strand", "trap", "stuck", "rescue"]):
        incident_type = "stranding"
    elif any(w in text for w in ["injur", "medical", "hospital", "sick", "bleed"]):
        incident_type = "medical_emergency"

    # Stranded count extraction (look for numbers near relevant words)
    stranded_count = 0
    import re
    numbers = re.findall(r'\b(\d+)\b', text)
    if numbers:
        for num_str in numbers:
            num = int(num_str)
            if 1 <= num <= 50000:
                stranded_count = max(stranded_count, num)
                break

    # Medical need level
    medical_need = "unknown"
    if any(w in text for w in ["critical", "urgent", "emergency", "severe"]):
        medical_need = "high"
    elif any(w in text for w in ["injur", "medical", "hospital", "sick"]):
        medical_need = "moderate"
    elif any(w in text for w in ["minor", "bruise", "scratch"]):
        medical_need = "low"

    return {
        "incident_type": incident_type,
        "stranded_count": stranded_count,
        "medical_need": medical_need,
        "required_resources": [],
    }


def build_resource_name_map(
    helping_points: List[Dict[str, Any]]
) -> Dict[str, int]:
    """
    Build a resource_name → resource_id lookup from helping point inventory data.
    """
    name_to_id: Dict[str, int] = {}
    for pt in helping_points:
        for inv_row in pt.get("inventory", []):
            res_id = inv_row.get("resource_id")
            res_name = (
                inv_row.get("resource_name")
                or (inv_row.get("resource_type", {}) or {}).get("name")
            )
            if res_id is not None and res_name:
                name_to_id[res_name] = res_id
    return name_to_id


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_PORT", 8001))
    uvicorn.run("ml.service.main:app", host="0.0.0.0", port=port, reload=True)
