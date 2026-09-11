"""
Unit tests for RESQ ML Feature Builder (ml/src/features/builder.py).
"""

import pytest
from ml.src.schemas import FEATURE_NAMES
from ml.src.features.builder import build_features_from_payload
from ml.src.predict import predict_severity

FULL_VALID_PAYLOAD = {
    "zone": {
        "population_estimate": 4000,
        "disaster_duration_hours": 7,
        "population_vulnerability": 0.72
    },
    "reports": [
        {
            "stranded_people": 70,
            "medical_cases": 40,
            "severity_signal": 0.8
        },
        {
            "stranded_people": 50,
            "medical_cases": 25,
            "severity_signal": 0.9
        }
    ],
    "operational_state": {
        "water_level": 0.78,
        "hospital_occupancy": 0.91,
        "shelter_occupancy": 0.68,
        "road_blocked": True,
        "food_shortage_ratio": 0.30,
        "water_shortage_ratio": 0.45
    }
}


def test_complete_valid_payload():
    features = build_features_from_payload(FULL_VALID_PAYLOAD)
    assert len(features) == 12
    assert list(features.keys()) == FEATURE_NAMES
    assert features["affected_population"] == 4000.0
    assert features["stranded_people"] == 120.0  # 70 + 50
    assert features["medical_cases"] == 65.0  # 40 + 25
    assert features["sos_count"] == 2.0  # len(reports)
    assert features["road_blocked"] == 1.0


def test_provenance_output():
    res = build_features_from_payload(FULL_VALID_PAYLOAD, include_provenance=True)
    assert "features" in res
    assert "provenance" in res
    prov = res["provenance"]
    assert prov["affected_population"]["source"] == "zone.population_estimate"
    assert prov["stranded_people"]["source"] == "reports.sum(stranded_people)"
    assert prov["sos_count"]["source"] == "reports.count"


def test_road_blocked_string_and_bool_normalization():
    payload_str = {
        "operational_state": {"road_blocked": "BLOCKED"}
    }
    feats = build_features_from_payload(payload_str)
    assert feats["road_blocked"] == 1.0

    payload_false = {
        "operational_state": {"road_blocked": False}
    }
    feats_false = build_features_from_payload(payload_false)
    assert feats_false["road_blocked"] == 0.0


def test_missing_optional_sections():
    empty_payload = {}
    feats = build_features_from_payload(empty_payload)
    assert len(feats) == 12
    assert feats["sos_count"] == 0.0
    assert feats["stranded_people"] == 0.0
    assert feats["affected_population"] == 0.0


def test_explicit_overrides_in_operational_state():
    payload = {
        "zone": {"population_estimate": 10000},
        "reports": [{"stranded_people": 50}],
        "operational_state": {
            "affected_population": 5000,
            "stranded_people": 200
        }
    }
    feats = build_features_from_payload(payload)
    assert feats["affected_population"] == 5000.0  # Overridden by operational_state
    assert feats["stranded_people"] == 200.0  # Overridden by operational_state


def test_boundary_and_clamping_values():
    payload = {
        "operational_state": {
            "water_level": 5.0,  # Range is [0, 1]
            "hospital_occupancy": -2.0  # Range is [0, 1]
        }
    }
    feats = build_features_from_payload(payload)
    assert feats["water_level"] == 1.0  # Clamped to max
    assert feats["hospital_occupancy"] == 0.0  # Clamped to min


def test_invalid_payload_type():
    with pytest.raises(ValueError, match="Payload must be a dictionary"):
        build_features_from_payload("invalid_string_payload")


def test_nan_or_inf_handling():
    payload = {
        "operational_state": {
            "water_level": float("nan")
        }
    }
    with pytest.raises(ValueError, match="invalid float"):
        build_features_from_payload(payload)


def test_flooded_hospital_scenario_integration():
    """Integration test: Feature builder output passed directly into predict_severity()."""
    scenario_payload = {
        "zone": {
            "population_estimate": 15000,
            "disaster_duration_hours": 18,
            "population_vulnerability": 0.80
        },
        "reports": [
            {"stranded_people": 300, "medical_cases": 150, "severity_signal": 0.95},
            {"stranded_people": 150, "medical_cases": 100, "severity_signal": 0.90}
        ],
        "operational_state": {
            "water_level": 0.92,
            "hospital_occupancy": 0.98,
            "shelter_occupancy": 0.85,
            "road_blocked": "BLOCKED",
            "food_shortage_ratio": 0.60,
            "water_shortage_ratio": 0.70
        }
    }
    features = build_features_from_payload(scenario_payload)
    prediction = predict_severity(features)

    assert prediction["severity_level"] == "CRITICAL"
    assert prediction["severity_score"] >= 0.75
    assert prediction["model"] in ["xgboost", "rule_based_fallback"]
