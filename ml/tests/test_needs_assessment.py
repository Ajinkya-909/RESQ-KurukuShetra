"""
Comprehensive unit tests for RESQ Needs Assessment Engine (ml/src/needs/assessment.py).
"""

import pytest
from ml.src.needs import assess_needs


def test_basic_shortage_calculation():
    forecast = {"water": 650, "food": 420, "medical_kits": 110}
    inventory = {"water": 500, "food": 300, "medical_kits": 80}

    res = assess_needs("ZONE-001", 0.82, forecast, inventory)
    assert res["zone_id"] == "ZONE-001"
    assert res["severity_score"] == 0.82
    assert res["severity_level"] == "CRITICAL"
    assert res["needs"]["water"] == 150.0
    assert res["needs"]["food"] == 120.0
    assert res["needs"]["medical_kits"] == 30.0


def test_resource_fully_covered_by_inventory():
    forecast = {"water": 500}
    inventory = {"water": 600}

    res = assess_needs("ZONE-002", 0.40, forecast, inventory)
    assert res["needs"]["water"] == 0.0
    assert res["severity_level"] == "MODERATE"


def test_missing_inventory_defaulted_to_zero():
    forecast = {"water": 650, "oxygen": 50}
    inventory = {"water": 500}  # oxygen is missing

    res = assess_needs("ZONE-003", 0.60, forecast, inventory)
    assert res["needs"]["water"] == 150.0
    assert res["needs"]["oxygen"] == 50.0  # Full requirement needed
    assert res["current_inventory"]["oxygen"] == 0.0


def test_forecast_list_uses_final_horizon_value():
    forecast_list = {
        "water": [550, 600, 650],  # Final is 650
        "food": [350, 390, 420]  # Final is 420
    }
    inventory = {"water": 500, "food": 300}

    res = assess_needs("ZONE-004", 0.80, forecast_list, inventory)
    assert res["needs"]["water"] == 150.0
    assert res["needs"]["food"] == 120.0


def test_severity_level_mapping_boundaries():
    assert assess_needs("Z", 0.10, {"w": 10}, {"w": 0})["severity_level"] == "LOW"
    assert assess_needs("Z", 0.35, {"w": 10}, {"w": 0})["severity_level"] == "MODERATE"
    assert assess_needs("Z", 0.60, {"w": 10}, {"w": 0})["severity_level"] == "HIGH"
    assert assess_needs("Z", 0.85, {"w": 10}, {"w": 0})["severity_level"] == "CRITICAL"


def test_provenance_output():
    forecast = {"water": 650}
    inventory = {"water": 500}
    res = assess_needs("ZONE-005", 0.82, forecast, inventory, include_provenance=True)
    assert "provenance" in res
    assert res["provenance"]["water"]["forecast_requirement"] == 650.0
    assert res["provenance"]["water"]["current_inventory"] == 500.0
    assert res["provenance"]["water"]["shortage"] == 150.0


def test_invalid_zone_id_rejection():
    with pytest.raises(ValueError, match="zone_id must be a non-empty string"):
        assess_needs("", 0.8, {"water": 100}, {"water": 50})

    with pytest.raises(ValueError, match="zone_id must be a non-empty string"):
        assess_needs(None, 0.8, {"water": 100}, {"water": 50})


def test_invalid_severity_score_rejection():
    with pytest.raises(ValueError, match="severity_score must be a finite float in \\[0.0, 1.0\\]"):
        assess_needs("ZONE", 1.5, {"water": 100}, {"water": 50})

    with pytest.raises(ValueError, match="severity_score must be a finite float in \\[0.0, 1.0\\]"):
        assess_needs("ZONE", -0.1, {"water": 100}, {"water": 50})


def test_negative_forecast_or_inventory_rejection():
    with pytest.raises(ValueError, match="must be finite and non-negative"):
        assess_needs("ZONE", 0.5, {"water": -100}, {"water": 50})

    with pytest.raises(ValueError, match="must be finite and non-negative"):
        assess_needs("ZONE", 0.5, {"water": 100}, {"water": -50})


def test_nan_or_inf_rejection():
    with pytest.raises(ValueError, match="must be finite and non-negative"):
        assess_needs("ZONE", 0.5, {"water": float("nan")}, {"water": 50})

    with pytest.raises(ValueError, match="must be finite and non-negative"):
        assess_needs("ZONE", 0.5, {"water": 100}, {"water": float("inf")})


def test_realistic_disaster_scenario():
    """Realistic scenario matching Phase 4A forecast output."""
    severity_score = 0.82
    forecast = {
        "water": [550, 600, 650],
        "food": [350, 390, 420],
        "medical_kits": [90, 100, 110]
    }
    inventory = {
        "water": 500,
        "food": 300,
        "medical_kits": 80
    }

    res = assess_needs("ZONE-FLOOD-C", severity_score, forecast, inventory)

    assert res["zone_id"] == "ZONE-FLOOD-C"
    assert res["severity_score"] == 0.82
    assert res["severity_level"] == "CRITICAL"
    assert res["needs"]["water"] == 150.0
    assert res["needs"]["food"] == 120.0
    assert res["needs"]["medical_kits"] == 30.0
    assert all(val >= 0.0 for val in res["needs"].values())
