"""
Single source of truth for feature definitions, mappings, and validation logic.
"""

from typing import List, Dict, Any, Tuple

# Exact operational feature names and ordering
FEATURE_NAMES: List[str] = [
    "affected_population",
    "stranded_people",
    "water_level",
    "hospital_occupancy",
    "medical_cases",
    "road_blocked",
    "sos_count",
    "shelter_occupancy",
    "food_shortage_ratio",
    "water_shortage_ratio",
    "disaster_duration_hours",
    "population_vulnerability",
]

# Validation rules for features
NUMERICAL_RANGES: Dict[str, Tuple[float, float]] = {
    "affected_population": (0.0, 1_000_000.0),
    "stranded_people": (0.0, 100_000.0),
    "water_level": (0.0, 1.0),
    "hospital_occupancy": (0.0, 1.0),
    "medical_cases": (0.0, 50_000.0),
    "road_blocked": (0.0, 1.0),
    "sos_count": (0.0, 10_000.0),
    "shelter_occupancy": (0.0, 1.0),
    "food_shortage_ratio": (0.0, 1.0),
    "water_shortage_ratio": (0.0, 1.0),
    "disaster_duration_hours": (0.0, 720.0), # Up to 30 days
    "population_vulnerability": (0.0, 1.0),
}


def map_severity_score_to_level(score: float) -> str:
    """
    Maps continuous severity score in [0.0, 1.0] to discrete operational severity levels:
    0.00 - 0.24 -> LOW
    0.25 - 0.49 -> MODERATE
    0.50 - 0.74 -> HIGH
    0.75 - 1.00 -> CRITICAL
    """
    clamped_score = max(0.0, min(1.0, float(score)))
    if clamped_score < 0.25:
        return "LOW"
    elif clamped_score < 0.50:
        return "MODERATE"
    elif clamped_score < 0.75:
        return "HIGH"
    else:
        return "CRITICAL"


def validate_features(features: Dict[str, Any]) -> Dict[str, float]:
    """
    Validates and standardizes input feature dictionary against FEATURE_NAMES schema.
    Raises ValueError if unknown features or missing required features are encountered.
    """
    missing_features = [f for f in FEATURE_NAMES if f not in features]
    if missing_features:
        raise ValueError(f"Missing required features: {missing_features}")

    extra_features = [f for f in features.keys() if f not in FEATURE_NAMES]
    if extra_features:
        raise ValueError(f"Unknown features provided: {extra_features}")

    validated: Dict[str, float] = {}
    for feature_name in FEATURE_NAMES:
        val = features[feature_name]
        try:
            val_float = float(val)
        except (ValueError, TypeError):
            raise ValueError(f"Feature '{feature_name}' must be a numerical value, got {type(val)}: {val}")

        min_val, max_val = NUMERICAL_RANGES[feature_name]
        if not (min_val <= val_float <= max_val):
            raise ValueError(f"Feature '{feature_name}' value {val_float} out of valid range [{min_val}, {max_val}]")

        validated[feature_name] = val_float

    return validated
