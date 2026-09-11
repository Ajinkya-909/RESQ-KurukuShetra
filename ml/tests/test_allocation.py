"""
Comprehensive unit tests for Google OR-Tools Resource Allocation Optimizer (ml/src/allocation/optimizer.py).
"""

import pytest
from ml.src.allocation import optimize_allocations

REASONABLE_ZONES = [
    {
        "zone_id": "ZONE-A",
        "severity_score": 0.90,
        "needs": {
            "water": 500,
            "food": 300,
            "medical_kits": 100
        }
    },
    {
        "zone_id": "ZONE-B",
        "severity_score": 0.70,
        "needs": {
            "water": 400,
            "food": 200,
            "medical_kits": 50
        }
    }
]

REASONABLE_HELPING_POINTS = [
    {
        "helping_point_id": "HP-1",
        "inventory": {
            "water": 600,
            "food": 200,
            "medical_kits": 50
        }
    },
    {
        "helping_point_id": "HP-2",
        "inventory": {
            "water": 500,
            "food": 500,
            "medical_kits": 150
        }
    }
]


def test_realistic_hackathon_scenario():
    res = optimize_allocations(REASONABLE_ZONES, REASONABLE_HELPING_POINTS)
    assert res["status"] in ["OPTIMAL", "FEASIBLE"]
    assert "allocations" in res
    assert "unmet_demand" in res
    assert "summary" in res

    # Summary checks
    assert res["summary"]["total_requested"] == 1550.0  # (500+300+100) + (400+200+50)
    assert res["summary"]["total_allocated"] == 1550.0  # Fully satisfiable demand
    assert res["summary"]["total_unmet"] == 0.0

    # Guarantee no allocation exceeds inventory capacity
    hp_delivered = {"HP-1": {}, "HP-2": {}}
    zone_received = {"ZONE-A": {}, "ZONE-B": {}}

    for alloc in res["allocations"]:
        hp = alloc["helping_point_id"]
        z = alloc["zone_id"]
        r = alloc["resource"]
        q = alloc["quantity"]
        assert q > 0.0

        hp_delivered[hp][r] = hp_delivered[hp].get(r, 0.0) + q
        zone_received[z][r] = zone_received[z].get(r, 0.0) + q

    # Verify inventory limits
    for hp in REASONABLE_HELPING_POINTS:
        hp_id = hp["helping_point_id"]
        for r, stock in hp["inventory"].items():
            assert hp_delivered[hp_id].get(r, 0.0) <= stock + 1e-4

    # Verify demand limits
    for z in REASONABLE_ZONES:
        z_id = z["zone_id"]
        for r, need in z["needs"].items():
            assert zone_received[z_id].get(r, 0.0) <= need + 1e-4


def test_insufficient_supply_priority_optimization():
    # ZONE-CRITICAL has 0.95 severity, ZONE-MODERATE has 0.30 severity
    # Supply of water is 300 total, but needs are 300 and 300 (total 600)
    zones = [
        {"zone_id": "ZONE-CRITICAL", "severity_score": 0.95, "needs": {"water": 300}},
        {"zone_id": "ZONE-MODERATE", "severity_score": 0.30, "needs": {"water": 300}}
    ]
    points = [
        {"helping_point_id": "HP-DEPOT", "inventory": {"water": 300}}
    ]

    res = optimize_allocations(zones, points)
    assert res["status"] in ["OPTIMAL", "FEASIBLE"]
    assert res["summary"]["total_allocated"] == 300.0
    assert res["summary"]["total_unmet"] == 300.0

    # Higher severity zone must be prioritized
    critical_alloc = [a for a in res["allocations"] if a["zone_id"] == "ZONE-CRITICAL"]
    assert len(critical_alloc) == 1
    assert critical_alloc[0]["quantity"] == 300.0
    assert res["unmet_demand"]["ZONE-MODERATE"]["water"] == 300.0


def test_one_zone_one_hp_one_resource():
    zones = [{"zone_id": "Z1", "severity_score": 0.5, "needs": {"water": 100}}]
    points = [{"helping_point_id": "HP1", "inventory": {"water": 60}}]

    res = optimize_allocations(zones, points)
    assert res["summary"]["total_allocated"] == 60.0
    assert res["unmet_demand"]["Z1"]["water"] == 40.0


def test_resource_unavailable_everywhere():
    zones = [{"zone_id": "Z1", "severity_score": 0.8, "needs": {"blankets": 50}}]
    points = [{"helping_point_id": "HP1", "inventory": {"water": 500}}]  # No blankets

    res = optimize_allocations(zones, points)
    assert len(res["allocations"]) == 0
    assert res["summary"]["total_allocated"] == 0.0
    assert res["unmet_demand"]["Z1"]["blankets"] == 50.0


def test_same_resource_supplied_by_multiple_helping_points():
    zones = [{"zone_id": "Z1", "severity_score": 0.9, "needs": {"water": 500}}]
    points = [
        {"helping_point_id": "HP1", "inventory": {"water": 300}},
        {"helping_point_id": "HP2", "inventory": {"water": 400}}
    ]

    res = optimize_allocations(zones, points)
    assert res["summary"]["total_allocated"] == 500.0  # 300 from HP1 + 200 from HP2
    hps_used = {a["helping_point_id"] for a in res["allocations"]}
    assert len(hps_used) == 2


def test_zone_with_zero_need_or_hp_with_zero_inventory():
    zones = [{"zone_id": "Z1", "severity_score": 0.5, "needs": {"water": 0}}]
    points = [{"helping_point_id": "HP1", "inventory": {"water": 0}}]

    res = optimize_allocations(zones, points)
    assert len(res["allocations"]) == 0
    assert res["summary"]["total_allocated"] == 0.0


def test_determinism():
    res1 = optimize_allocations(REASONABLE_ZONES, REASONABLE_HELPING_POINTS)
    res2 = optimize_allocations(REASONABLE_ZONES, REASONABLE_HELPING_POINTS)
    assert res1 == res2


def test_invalid_input_validations():
    with pytest.raises(ValueError, match="zones must be a list"):
        optimize_allocations("invalid", REASONABLE_HELPING_POINTS)

    with pytest.raises(ValueError, match="helping_points must be a list"):
        optimize_allocations(REASONABLE_ZONES, "invalid")

    with pytest.raises(ValueError, match="Duplicate zone_id"):
        optimize_allocations([REASONABLE_ZONES[0], REASONABLE_ZONES[0]], REASONABLE_HELPING_POINTS)

    with pytest.raises(ValueError, match="severity_score must be a finite float in \\[0.0, 1.0\\]"):
        optimize_allocations([{"zone_id": "Z", "severity_score": 2.0, "needs": {}}], REASONABLE_HELPING_POINTS)

    with pytest.raises(ValueError, match="need must be finite and non-negative"):
        optimize_allocations([{"zone_id": "Z", "severity_score": 0.5, "needs": {"w": -10}}], REASONABLE_HELPING_POINTS)

    with pytest.raises(ValueError, match="inventory must be finite and non-negative"):
        optimize_allocations(REASONABLE_ZONES, [{"helping_point_id": "HP", "inventory": {"w": -10}}])

    with pytest.raises(ValueError, match="inventory must be finite and non-negative"):
        optimize_allocations(REASONABLE_ZONES, [{"helping_point_id": "HP", "inventory": {"w": float("nan")}}])
