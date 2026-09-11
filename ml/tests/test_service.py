"""
FastAPI Service tests for RESQ ML Service endpoints.
Tests GET /health, POST /predict/severity with valid payloads, invalid ranges,
missing features, unknown features, realistic flooded hospital scenario, and HTTP errors.
"""

import pytest
from fastapi.testclient import TestClient
from ml.service.main import app

client = TestClient(app)

VALID_PAYLOAD = {
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

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "RESQ ML Service"
    assert data["version"] == "1.0.0"

def test_predict_severity_valid():
    response = client.post("/predict/severity", json=VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert "severity_score" in data
    assert "severity_level" in data
    assert 0.0 <= data["severity_score"] <= 1.0
    assert data["severity_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert data["model"] in ["xgboost", "rule_based_fallback"]

def test_predict_severity_missing_feature():
    invalid_payload = VALID_PAYLOAD.copy()
    del invalid_payload["affected_population"]
    response = client.post("/predict/severity", json=invalid_payload)
    assert response.status_code == 422

def test_predict_severity_invalid_range():
    invalid_payload = VALID_PAYLOAD.copy()
    invalid_payload["water_level"] = 5.0 # Must be <= 1.0
    response = client.post("/predict/severity", json=invalid_payload)
    assert response.status_code == 422

def test_predict_severity_unknown_feature():
    invalid_payload = VALID_PAYLOAD.copy()
    invalid_payload["unknown_feature"] = 100
    response = client.post("/predict/severity", json=invalid_payload)
    assert response.status_code == 422

def test_flooded_hospital_scenario_endpoint():
    critical_payload = {
        "affected_population": 15000,
        "stranded_people": 450,
        "water_level": 0.92,
        "hospital_occupancy": 0.98,
        "medical_cases": 250,
        "road_blocked": 1,
        "sos_count": 18,
        "shelter_occupancy": 0.85,
        "food_shortage_ratio": 0.60,
        "water_shortage_ratio": 0.70,
        "disaster_duration_hours": 18,
        "population_vulnerability": 0.80
    }
    response = client.post("/predict/severity", json=critical_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["severity_level"] == "CRITICAL"
    assert data["severity_score"] >= 0.75
