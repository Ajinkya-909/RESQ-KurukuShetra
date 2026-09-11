"""
FastAPI Service integration tests for /intelligence/analyze endpoint (ml/tests/test_intelligence_api.py).
"""

import pytest
from fastapi.testclient import TestClient
from ml.service.main import app

client = TestClient(app)

VALID_INTELLIGENCE_API_PAYLOAD = {
    "horizon": 3,
    "include_provenance": True,
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


def test_analyze_endpoint_valid_request():
    response = client.post("/intelligence/analyze", json=VALID_INTELLIGENCE_API_PAYLOAD)
    assert response.status_code == 200
    data = response.json()

    assert data["zone_id"] == "ZONE-FLOOD-C"
    assert "severity" in data
    assert "forecast" in data
    assert "needs" in data
    assert "allocation" in data

    assert data["severity"]["level"] == "CRITICAL"
    assert data["allocation"]["status"] in ["OPTIMAL", "FEASIBLE"]
    assert "provenance" in data


def test_analyze_endpoint_horizon_options():
    payload_h1 = VALID_INTELLIGENCE_API_PAYLOAD.copy()
    payload_h1["horizon"] = 1
    response = client.post("/intelligence/analyze", json=payload_h1)
    assert response.status_code == 200
    assert len(response.json()["forecast"]["water"]) == 1

    payload_h3 = VALID_INTELLIGENCE_API_PAYLOAD.copy()
    payload_h3["horizon"] = 3
    response = client.post("/intelligence/analyze", json=payload_h3)
    assert response.status_code == 200
    assert len(response.json()["forecast"]["water"]) == 3


def test_analyze_endpoint_invalid_horizon():
    payload = VALID_INTELLIGENCE_API_PAYLOAD.copy()
    payload["horizon"] = 0
    response = client.post("/intelligence/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_endpoint_missing_zone():
    payload = VALID_INTELLIGENCE_API_PAYLOAD.copy()
    del payload["zone"]
    response = client.post("/intelligence/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_endpoint_negative_inventory_rejection():
    payload = VALID_INTELLIGENCE_API_PAYLOAD.copy()
    payload["zone_inventory"] = {"water": -50}
    response = client.post("/intelligence/analyze", json=payload)
    assert response.status_code == 422


def test_analyze_endpoint_insufficient_supply_unmet_demand():
    payload = VALID_INTELLIGENCE_API_PAYLOAD.copy()
    payload["helping_points"] = [
        {"helping_point_id": "HP-TINY", "inventory": {"water": 50}}
    ]
    response = client.post("/intelligence/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["allocation"]["summary"]["total_unmet"] > 0.0


def test_existing_health_and_severity_endpoints_still_work():
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    severity_payload = {
        "affected_population": 4000,
        "stranded_people": 120,
        "water_level": 0.78,
        "hospital_occupancy": 0.91,
        "medical_cases": 65,
        "road_blocked": 1,
        "sos_count": 5,
        "shelter_occupancy": 0.68,
        "food_shortage_ratio": 0.30,
        "water_shortage_ratio": 0.45,
        "disaster_duration_hours": 7,
        "population_vulnerability": 0.72
    }
    res_sev = client.post("/predict/severity", json=severity_payload)
    assert res_sev.status_code == 200
    assert "severity_score" in res_sev.json()


def test_analyze_endpoint_determinism():
    res1 = client.post("/intelligence/analyze", json=VALID_INTELLIGENCE_API_PAYLOAD)
    res2 = client.post("/intelligence/analyze", json=VALID_INTELLIGENCE_API_PAYLOAD)
    assert res1.json() == res2.json()
