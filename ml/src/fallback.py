"""
Rule-based severity estimation fallback when XGBoost ML model is uninitialized or unavailable.
"""

from typing import Dict, Any
from ml.src.schemas import validate_features, map_severity_score_to_level

def predict_severity_rule_based(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes a deterministic severity score and level using domain rules.
    Used as a fallback mechanism to guarantee system reliability.
    """
    validated = validate_features(features)

    # Normalized component heuristics
    f_pop = min(1.0, validated["affected_population"] / 50000.0) * 0.15
    f_stranded = min(1.0, validated["stranded_people"] / 5000.0) * 0.20
    f_water = validated["water_level"] * 0.15
    f_hosp = validated["hospital_occupancy"] * 0.15
    f_med = min(1.0, validated["medical_cases"] / 2000.0) * 0.15
    f_road = validated["road_blocked"] * 0.10
    f_sos = min(1.0, validated["sos_count"] / 50.0) * 0.10

    raw_score = f_pop + f_stranded + f_water + f_hosp + f_med + f_road + f_sos

    # Compound rule boosts
    if validated["hospital_occupancy"] > 0.85 and validated["medical_cases"] > 50:
        raw_score += 0.10
    if validated["water_level"] > 0.70 and validated["road_blocked"] == 1.0:
        raw_score += 0.10

    clamped_score = float(max(0.0, min(1.0, round(raw_score, 4))))
    level = map_severity_score_to_level(clamped_score)

    return {
        "severity_score": clamped_score,
        "severity_level": level,
        "model": "rule_based_fallback",
        "model_version": "fallback-1.0"
    }
