"""
Comprehensive integration test suite for RESQ Unified ML Intelligence Pipeline (ml/src/pipeline/intelligence.py).
"""

import pytest
from ml.src.pipeline import run_intelligence_pipeline

FULL_INTELLIGENCE_PAYLOAD = {
    "zone": {
        "zone_id": "ZONE-FLOOD-C",
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
        "road_blocked": True,
        "food_shortage_ratio": 0.60,
        "water_shortage_ratio": 0.70
    },
    "historical_demand": {
        "water": [400, 450, 500, 550, 600, 650],
        "food": [250, 280, 300, 330, 360, 390],
        "medical_kits": [50, 55, 60, 70, 75, 80]
    },
    "zone_inventory": {
        "water": 300,
        "food": 150,
        "medical_kits": 50
    },
    "helping_points": [
        {
            "helping_point_id": "HP-DEPOT-ALPHA",
            "inventory": {"water": 400, "food": 200, "medical_kits": 50}
        },
        {
            "helping_point_id": "HP-DEPOT-BETA",
            "inventory": {"water": 300, "food": 300, "medical_kits": 50}
        }
    ]
}


def test_end_to_end_intelligence_pipeline_success():
    res = run_intelligence_pipeline(FULL_INTELLIGENCE_PAYLOAD, horizon=3, include_provenance=True)

    assert res["zone_id"] == "ZONE-FLOOD-C"

    # 1. Severity checks
    assert res["severity"]["level"] == "CRITICAL"
    assert res["severity"]["score"] >= 0.75
    assert res["severity"]["model"] in ["xgboost", "rule_based_fallback"]

    # 2. Forecast checks
    assert "water" in res["forecast"]
    assert len(res["forecast"]["water"]) == 3
    assert res["forecast"]["water"][-1] > 650.0

    # 3. Needs checks (Needs = Forecast Final - Zone Inventory)
    # water final forecast is ~820, zone inventory is 300 -> need is ~520
    assert res["needs"]["water"] > 0.0
    assert res["needs"]["food"] > 0.0

    # 4. Allocation checks
    assert res["allocation"]["status"] in ["OPTIMAL", "FEASIBLE"]
    assert len(res["allocation"]["allocations"]) > 0
    assert res["allocation"]["summary"]["total_allocated"] > 0.0

    # 5. Provenance check
    assert "provenance" in res


def test_forecast_horizon_option_1_and_3():
    res1 = run_intelligence_pipeline(FULL_INTELLIGENCE_PAYLOAD, horizon=1)
    assert len(res1["forecast"]["water"]) == 1

    res3 = run_intelligence_pipeline(FULL_INTELLIGENCE_PAYLOAD, horizon=3)
    assert len(res3["forecast"]["water"]) == 3


def test_insufficient_helping_point_supply_propagation():
    # Helping points have only 100 water total, but zone needs > 500
    scarce_payload = FULL_INTELLIGENCE_PAYLOAD.copy()
    scarce_payload["helping_points"] = [
        {"helping_point_id": "HP-SMALL", "inventory": {"water": 100, "food": 50}}
    ]

    res = run_intelligence_pipeline(scarce_payload, horizon=3)
    alloc_summary = res["allocation"]["summary"]
    assert alloc_summary["total_unmet"] > 0.0
    assert alloc_summary["total_allocated"] <= 150.0


def test_missing_optional_reports_and_operational_state():
    minimal_payload = {
        "zone": {"zone_id": "ZONE-MINIMAL", "population_estimate": 2000},
        "historical_demand": {"water": [10, 20, 30]},
        "zone_inventory": {"water": 10},
        "helping_points": [{"helping_point_id": "HP-1", "inventory": {"water": 100}}]
    }
    res = run_intelligence_pipeline(minimal_payload)
    assert res["zone_id"] == "ZONE-MINIMAL"
    assert "severity" in res
    assert "forecast" in res
    assert "needs" in res
    assert "allocation" in res


def test_no_helping_points_provided_behavior():
    no_hp_payload = FULL_INTELLIGENCE_PAYLOAD.copy()
    no_hp_payload["helping_points"] = []

    res = run_intelligence_pipeline(no_hp_payload)
    assert res["allocation"]["status"] == "NO_HELPING_POINTS_PROVIDED"
    assert len(res["allocation"]["allocations"]) == 0
    assert res["allocation"]["summary"]["total_unmet"] == res["allocation"]["summary"]["total_requested"]


def test_invalid_payload_rejections():
    with pytest.raises(ValueError, match="Pipeline payload must be a dictionary"):
        run_intelligence_pipeline("invalid_string_payload")

    with pytest.raises(ValueError, match="valid 'zone_id'"):
        run_intelligence_pipeline({})

    with pytest.raises(ValueError, match="valid 'zone_id'"):
        run_intelligence_pipeline({"zone": {}})


def test_determinism():
    res1 = run_intelligence_pipeline(FULL_INTELLIGENCE_PAYLOAD, horizon=3)
    res2 = run_intelligence_pipeline(FULL_INTELLIGENCE_PAYLOAD, horizon=3)
    assert res1 == res2
