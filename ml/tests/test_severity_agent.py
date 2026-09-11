"""
Unit tests for RESQ ML Phase 1 Severity Agent.
Tests feature schema validation, synthetic data generation, XGBoost training,
predictive inference, rule-based fallback, score clamping, missing feature handling,
and realistic disaster scenario evaluation.
"""

import os
import pytest
from ml.src.schemas import FEATURE_NAMES, validate_features, map_severity_score_to_level
from ml.src.generate_data import generate_synthetic_data
from ml.src.fallback import predict_severity_rule_based
from ml.src.predict import predict_severity
from ml.src.train import train_model

@pytest.fixture(scope="session", autouse=True)
def ensure_model_trained():
    """Ensure trained model artifact exists for tests."""
    train_model()

def test_feature_validation_valid():
    sample = {
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
    validated = validate_features(sample)
    assert len(validated) == len(FEATURE_NAMES)
    assert validated["affected_population"] == 4000.0

def test_feature_validation_missing_key():
    sample = {"affected_population": 4000}
    with pytest.raises(ValueError, match="Missing required features"):
        validate_features(sample)

def test_feature_validation_unknown_key():
    sample = {f: 0.1 for f in FEATURE_NAMES}
    sample["unknown_param"] = 123
    with pytest.raises(ValueError, match="Unknown features provided"):
        validate_features(sample)

def test_severity_level_mapping():
    assert map_severity_score_to_level(0.10) == "LOW"
    assert map_severity_score_to_level(0.35) == "MODERATE"
    assert map_severity_score_to_level(0.60) == "HIGH"
    assert map_severity_score_to_level(0.85) == "CRITICAL"
    assert map_severity_score_to_level(1.50) == "CRITICAL"
    assert map_severity_score_to_level(-0.20) == "LOW"

def test_dataset_generation():
    df = generate_synthetic_data(num_samples=100)
    assert len(df) == 100
    assert "severity_score" in df.columns
    assert (df["severity_score"] >= 0.0).all() and (df["severity_score"] <= 1.0).all()

def test_rule_based_fallback():
    sample = {
        "affected_population": 5000,
        "stranded_people": 200,
        "water_level": 0.8,
        "hospital_occupancy": 0.9,
        "medical_cases": 100,
        "road_blocked": 1,
        "sos_count": 10,
        "shelter_occupancy": 0.5,
        "food_shortage_ratio": 0.2,
        "water_shortage_ratio": 0.2,
        "disaster_duration_hours": 12,
        "population_vulnerability": 0.5
    }
    res = predict_severity_rule_based(sample)
    assert "severity_score" in res
    assert 0.0 <= res["severity_score"] <= 1.0
    assert res["model"] == "rule_based_fallback"

def test_xgboost_predict():
    sample = {
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
    res = predict_severity(sample)
    assert "severity_score" in res
    assert "severity_level" in res
    assert 0.0 <= res["severity_score"] <= 1.0
    assert res["model"] == "xgboost"
    assert res["severity_level"] in ["HIGH", "CRITICAL"]

def test_flooded_hospital_critical_scenario():
    """Realistic scenario: Flooded hospital with trapped patients and blocked roads."""
    sample = {
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
    res = predict_severity(sample)
    assert res["severity_level"] == "CRITICAL"
    assert res["severity_score"] >= 0.75
