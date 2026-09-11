"""
Reusable inference module for RESQ Severity Agent.
Loads trained XGBoost model once, validates features, clamps predictions,
maps discrete levels, and provides automatic fallback if model file is missing.
"""

import os
import joblib
import pandas as pd
from typing import Dict, Any
from ml.src.schemas import FEATURE_NAMES, validate_features, map_severity_score_to_level
from ml.src.fallback import predict_severity_rule_based

# Resolve model path relative to the file location to support arbitrary CWD
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL_PATH = os.path.join(BASE_DIR, "ml", "models", "severity_xgboost.joblib")
MODEL_VERSION = "1.0.0"

_model = None

def _get_model():
    """Lazy loader for XGBoost model artifact."""
    global _model
    if _model is None:
        if os.path.exists(MODEL_PATH):
            _model = joblib.load(MODEL_PATH)
        else:
            _model = False # Flag that model is unavailable
    return _model

def predict_severity(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predicts continuous severity score [0.0, 1.0] and severity level for a disaster zone.

    Input: Dictionary containing exact 12 operational features.
    Output: Structured prediction dictionary.
    """
    # 1. Validate inputs
    validated = validate_features(features)

    # 2. Check model availability
    model = _get_model()
    if model is False or model is None:
        # Fallback to rule-based engine if model artifact is missing
        return predict_severity_rule_based(features)

    # 3. Format input DataFrame ensuring exact feature ordering
    input_df = pd.DataFrame([validated])[FEATURE_NAMES]

    # 4. Predict continuous raw score
    raw_pred = float(model.predict(input_df)[0])

    # 5. Clamp to [0.0, 1.0]
    clamped_score = float(max(0.0, min(1.0, round(raw_pred, 4))))

    # 6. Map to discrete level
    level = map_severity_score_to_level(clamped_score)

    return {
        "severity_score": clamped_score,
        "severity_level": level,
        "model": "xgboost",
        "model_version": MODEL_VERSION
    }
