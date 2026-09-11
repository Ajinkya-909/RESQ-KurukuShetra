"""
Unified RESQ ML Intelligence Orchestration Engine.
Orchestrates: Feature Builder -> XGBoost Severity -> Demand Forecasting -> Needs Assessment -> OR-Tools Allocation.
"""

from typing import Dict, Any, List
from ml.src.features.builder import build_features_from_payload
from ml.src.predict import predict_severity
from ml.src.forecasting.baseline import forecast_demand
from ml.src.needs.assessment import assess_needs
from ml.src.allocation.optimizer import optimize_allocations
from ml.src.pipeline.schemas import validate_pipeline_input


def run_intelligence_pipeline(
    payload: Dict[str, Any],
    horizon: int = 3,
    include_provenance: bool = False
) -> Dict[str, Any]:
    """
    Executes the end-to-end RESQ ML Intelligence Pipeline.

    Execution Pipeline:
    1. Feature Builder: Converts raw operational payload into 12 standardized model features.
    2. XGBoost Severity: Predicts continuous severity_score [0.0, 1.0] & severity_level.
    3. Demand Forecasting: Extrapolates historical demand series into N-hour future horizon.
    4. Needs Assessment: Calculates exact resource shortages (forecast requirement - zone_inventory).
    5. OR-Tools Allocation: Solves MILP model allocating available supply from helping points to satisfy zone needs.

    Returns comprehensive structured result.
    """
    # Validate payload contract
    validated = validate_pipeline_input(payload)
    zone_id = validated["zone_id"]

    # STEP 1: Feature Engineering
    fb_result = build_features_from_payload(payload, include_provenance=include_provenance)
    if include_provenance:
        model_features = fb_result["features"]
        feature_provenance = fb_result["provenance"]
    else:
        model_features = fb_result
        feature_provenance = None

    # STEP 2: Severity Prediction (XGBoost + Fallback)
    severity_pred = predict_severity(model_features)
    severity_score = severity_pred["severity_score"]
    severity_level = severity_pred["severity_level"]

    # STEP 3: Demand Forecasting (Phase 4A Baseline)
    historical_demand = validated["historical_demand"]
    if historical_demand:
        forecast_output = forecast_demand(historical_demand, horizon=horizon)
    else:
        forecast_output = {}

    # STEP 4: Needs Assessment (Phase 5A Engine)
    zone_inventory = validated["zone_inventory"]
    needs_result = assess_needs(
        zone_id=zone_id,
        severity_score=severity_score,
        forecast_demand=forecast_output,
        current_inventory=zone_inventory,
        include_provenance=include_provenance
    )
    zone_needs = needs_result["needs"]

    # STEP 5: OR-Tools Constrained Resource Allocation (Phase 5B Optimizer)
    helping_points = validated["helping_points"]

    if helping_points and zone_needs:
        # Prepare allocation input format
        zones_for_alloc = [
            {
                "zone_id": zone_id,
                "severity_score": severity_score,
                "needs": zone_needs
            }
        ]
        allocation_result = optimize_allocations(zones_for_alloc, helping_points)
    else:
        # No helping points provided or no shortages identified
        allocation_result = {
            "status": "NO_ACTION_REQUIRED" if not zone_needs else "NO_HELPING_POINTS_PROVIDED",
            "allocations": [],
            "unmet_demand": {zone_id: zone_needs} if zone_needs else {},
            "summary": {
                "total_requested": float(sum(zone_needs.values())),
                "total_allocated": 0.0,
                "total_unmet": float(sum(zone_needs.values()))
            }
        }

    # STEP 6: Synthesize Final Intelligence Result
    result: Dict[str, Any] = {
        "zone_id": zone_id,
        "severity": {
            "score": severity_score,
            "level": severity_level,
            "model": severity_pred["model"],
            "model_version": severity_pred["model_version"]
        },
        "forecast": forecast_output,
        "needs": zone_needs,
        "allocation": allocation_result
    }

    if include_provenance:
        result["provenance"] = {
            "features": feature_provenance,
            "needs": needs_result.get("provenance")
        }

    return result
