"""
Training script for RESQ XGBoost Severity Model.
Splits data (70% train, 15% val, 15% test), trains XGBoost Regressor, evaluates performance,
exports feature importances, and saves joblib model artifact with metadata.
"""

import os
import json
from datetime import datetime
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
    classification_report,
    confusion_matrix
)
from ml.src.schemas import FEATURE_NAMES, map_severity_score_to_level
from ml.src.generate_data import generate_synthetic_data, save_dataset

MODEL_VERSION = "1.0.0"
MODEL_SAVE_PATH = "ml/models/severity_xgboost.joblib"
METADATA_SAVE_PATH = "ml/models/severity_xgboost_metadata.json"
DATASET_PATH = "ml/data/raw/disaster_severity_dataset.csv"

def train_model() -> None:
    # 1. Load or generate dataset
    if not os.path.exists(DATASET_PATH):
        df = generate_synthetic_data(num_samples=10000)
        save_dataset(df, DATASET_PATH)
    else:
        df = pd.read_csv(DATASET_PATH)

    X = df[FEATURE_NAMES]
    y = df["severity_score"]

    # 2. Train / Validation / Test split (70 / 15 / 15)
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42
    )

    print(f"[Training] Train samples: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")

    # 3. Initialize & train XGBoost model
    model = xgb.XGBRegressor(
        n_estimators=150,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        objective="reg:squarederror"
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )

    # 4. Evaluate regression performance on test set
    preds = model.predict(X_test)
    preds_clamped = np.clip(preds, 0.0, 1.0)

    mae = float(mean_absolute_error(y_test, preds_clamped))
    rmse = float(root_mean_squared_error(y_test, preds_clamped))
    r2 = float(r2_score(y_test, preds_clamped))

    # 5. Evaluate discrete classification mapping performance
    y_test_levels = [map_severity_score_to_level(s) for s in y_test]
    preds_levels = [map_severity_score_to_level(s) for s in preds_clamped]

    labels = ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    clf_report = classification_report(y_test_levels, preds_levels, labels=labels, zero_division=0, output_dict=True)
    conf_matrix = confusion_matrix(y_test_levels, preds_levels, labels=labels).tolist()

    # 6. Feature importances
    importances = model.feature_importances_
    feat_imp_dict = {
        name: float(imp)
        for name, imp in sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
    }

    print("\n--- Model Evaluation Results ---")
    print(f"MAE:  {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"R²:   {r2:.4f}")
    print("\nTop 5 Important Features:")
    for feat, imp in list(feat_imp_dict.items())[:5]:
        print(f"  - {feat}: {imp:.4f}")

    # 7. Save model artifact
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    joblib.dump(model, MODEL_SAVE_PATH)
    print(f"\n[Model] Trained XGBoost model saved to {MODEL_SAVE_PATH}")

    # 8. Save metadata JSON
    metadata = {
        "model_name": "xgboost_severity_agent",
        "model_version": MODEL_VERSION,
        "training_date": datetime.now().isoformat(),
        "dataset_path": DATASET_PATH,
        "total_samples": len(df),
        "feature_names": FEATURE_NAMES,
        "metrics": {
            "mae": mae,
            "rmse": rmse,
            "r2": r2,
            "confusion_matrix": conf_matrix,
            "classification_report": clf_report
        },
        "feature_importances": feat_imp_dict,
        "severity_thresholds": {
            "LOW": [0.0, 0.24],
            "MODERATE": [0.25, 0.49],
            "HIGH": [0.50, 0.74],
            "CRITICAL": [0.75, 1.00]
        }
    }

    with open(METADATA_SAVE_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[Model] Metadata saved to {METADATA_SAVE_PATH}")

if __name__ == "__main__":
    train_model()
