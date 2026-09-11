"""
RESQ Operational Payload Feature Builder.
Converts incoming RESQ state payload dictionaries into exact 12 ML feature vectors
with complete provenance tracking and deterministic fallback policies.
"""

import math
from typing import Dict, Any, List, Tuple
from ml.src.schemas import FEATURE_NAMES, NUMERICAL_RANGES, validate_features

# Documented deterministic fallback values for unprovided measurements
DEFAULTS: Dict[str, float] = {
    "affected_population": 0.0,
    "stranded_people": 0.0,
    "water_level": 0.0,
    "hospital_occupancy": 0.0,
    "medical_cases": 0.0,
    "road_blocked": 0.0,
    "sos_count": 0.0,
    "shelter_occupancy": 0.0,
    "food_shortage_ratio": 0.0,
    "water_shortage_ratio": 0.0,
    "disaster_duration_hours": 0.0,
    "population_vulnerability": 0.0,
}


def build_features_from_payload(payload: Dict[str, Any], include_provenance: bool = False) -> Dict[str, Any]:
    """
    Transforms a standardized RESQ state payload into the 12 XGBoost operational features.

    Payload Schema:
    {
        "zone": {
            "population_estimate": float/int,
            "disaster_duration_hours": float/int,
            "population_vulnerability": float/int
        },
        "reports": [
            {
                "stranded_people": float/int,
                "medical_cases": float/int,
                "severity_signal": float/int
            }, ...
        ],
        "operational_state": {
            "water_level": float/int,
            "hospital_occupancy": float/int,
            "shelter_occupancy": float/int,
            "road_blocked": bool/int/float,
            "food_shortage_ratio": float/int,
            "water_shortage_ratio": float/int,
            "affected_population": float/int, # Optional explicit override
            "stranded_people": float/int,     # Optional explicit override
            "medical_cases": float/int       # Optional explicit override
        }
    }

    Returns:
    - If include_provenance is False: Dict[str, float] with 12 features.
    - If include_provenance is True: Dict containing "features" and "provenance".
    """
    if not isinstance(payload, dict):
        raise ValueError(f"Payload must be a dictionary, got {type(payload)}")

    zone = payload.get("zone") or {}
    reports = payload.get("reports") or []
    ops = payload.get("operational_state") or {}

    if not isinstance(zone, dict):
        raise ValueError("Field 'zone' must be a dictionary if provided")
    if not isinstance(reports, list):
        raise ValueError("Field 'reports' must be a list if provided")
    if not isinstance(ops, dict):
        raise ValueError("Field 'operational_state' must be a dictionary if provided")

    raw_features: Dict[str, float] = {}
    provenance: Dict[str, Dict[str, Any]] = {}

    # Helper function for setting feature value with provenance
    def set_feat(name: str, val: Any, source_desc: str, is_default: bool = False):
        try:
            if isinstance(val, bool):
                val_float = 1.0 if val else 0.0
            else:
                val_float = float(val)
        except (ValueError, TypeError):
            raise ValueError(f"Unable to convert value '{val}' for feature '{name}' to float.")

        if math.isnan(val_float) or math.isinf(val_float):
            raise ValueError(f"Feature '{name}' resolved to invalid float: {val_float}")

        min_val, max_val = NUMERICAL_RANGES[name]
        clamped_val = max(min_val, min(max_val, val_float))

        raw_features[name] = clamped_val
        provenance[name] = {
            "source": source_desc,
            "raw_value": val,
            "resolved_value": clamped_val,
            "defaulted": is_default
        }

    # 1. affected_population
    if "affected_population" in ops and ops["affected_population"] is not None:
        set_feat("affected_population", ops["affected_population"], "operational_state.affected_population")
    elif "population_estimate" in zone and zone["population_estimate"] is not None:
        set_feat("affected_population", zone["population_estimate"], "zone.population_estimate")
    else:
        set_feat("affected_population", DEFAULTS["affected_population"], "default_fallback", True)

    # 2. stranded_people
    if "stranded_people" in ops and ops["stranded_people"] is not None:
        set_feat("stranded_people", ops["stranded_people"], "operational_state.stranded_people")
    elif reports:
        report_stranded_sum = sum(
            float(r.get("stranded_people", 0) or 0)
            for r in reports if isinstance(r, dict)
        )
        set_feat("stranded_people", report_stranded_sum, "reports.sum(stranded_people)")
    else:
        set_feat("stranded_people", DEFAULTS["stranded_people"], "default_fallback", True)

    # 3. water_level
    if "water_level" in ops and ops["water_level"] is not None:
        set_feat("water_level", ops["water_level"], "operational_state.water_level")
    else:
        set_feat("water_level", DEFAULTS["water_level"], "default_fallback", True)

    # 4. hospital_occupancy
    if "hospital_occupancy" in ops and ops["hospital_occupancy"] is not None:
        set_feat("hospital_occupancy", ops["hospital_occupancy"], "operational_state.hospital_occupancy")
    else:
        set_feat("hospital_occupancy", DEFAULTS["hospital_occupancy"], "default_fallback", True)

    # 5. medical_cases
    if "medical_cases" in ops and ops["medical_cases"] is not None:
        set_feat("medical_cases", ops["medical_cases"], "operational_state.medical_cases")
    elif reports:
        report_med_sum = sum(
            float(r.get("medical_cases", 0) or 0)
            for r in reports if isinstance(r, dict)
        )
        set_feat("medical_cases", report_med_sum, "reports.sum(medical_cases)")
    else:
        set_feat("medical_cases", DEFAULTS["medical_cases"], "default_fallback", True)

    # 6. road_blocked
    if "road_blocked" in ops and ops["road_blocked"] is not None:
        raw_rb = ops["road_blocked"]
        if isinstance(raw_rb, str):
            rb_val = 1.0 if raw_rb.lower() in ["blocked", "true", "1", "yes"] else 0.0
        else:
            rb_val = 1.0 if bool(raw_rb) else 0.0
        set_feat("road_blocked", rb_val, "operational_state.road_blocked")
    else:
        set_feat("road_blocked", DEFAULTS["road_blocked"], "default_fallback", True)

    # 7. sos_count
    set_feat("sos_count", len(reports), "reports.count")

    # 8. shelter_occupancy
    if "shelter_occupancy" in ops and ops["shelter_occupancy"] is not None:
        set_feat("shelter_occupancy", ops["shelter_occupancy"], "operational_state.shelter_occupancy")
    else:
        set_feat("shelter_occupancy", DEFAULTS["shelter_occupancy"], "default_fallback", True)

    # 9. food_shortage_ratio
    if "food_shortage_ratio" in ops and ops["food_shortage_ratio"] is not None:
        set_feat("food_shortage_ratio", ops["food_shortage_ratio"], "operational_state.food_shortage_ratio")
    else:
        set_feat("food_shortage_ratio", DEFAULTS["food_shortage_ratio"], "default_fallback", True)

    # 10. water_shortage_ratio
    if "water_shortage_ratio" in ops and ops["water_shortage_ratio"] is not None:
        set_feat("water_shortage_ratio", ops["water_shortage_ratio"], "operational_state.water_shortage_ratio")
    else:
        set_feat("water_shortage_ratio", DEFAULTS["water_shortage_ratio"], "default_fallback", True)

    # 11. disaster_duration_hours
    if "disaster_duration_hours" in zone and zone["disaster_duration_hours"] is not None:
        set_feat("disaster_duration_hours", zone["disaster_duration_hours"], "zone.disaster_duration_hours")
    elif "disaster_duration_hours" in ops and ops["disaster_duration_hours"] is not None:
        set_feat("disaster_duration_hours", ops["disaster_duration_hours"], "operational_state.disaster_duration_hours")
    else:
        set_feat("disaster_duration_hours", DEFAULTS["disaster_duration_hours"], "default_fallback", True)

    # 12. population_vulnerability
    if "population_vulnerability" in zone and zone["population_vulnerability"] is not None:
        set_feat("population_vulnerability", zone["population_vulnerability"], "zone.population_vulnerability")
    elif "population_vulnerability" in ops and ops["population_vulnerability"] is not None:
        set_feat("population_vulnerability", ops["population_vulnerability"], "operational_state.population_vulnerability")
    else:
        set_feat("population_vulnerability", DEFAULTS["population_vulnerability"], "default_fallback", True)

    # Final validation pass against single source of truth schema
    validated_dict = validate_features(raw_features)

    if include_provenance:
        return {
            "features": validated_dict,
            "provenance": provenance
        }
    return validated_dict
