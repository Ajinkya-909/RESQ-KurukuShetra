"""
FastAPI HTTP Service for RESQ ML Intelligence Engine.
Exposes GET /health, POST /predict/severity, and POST /intelligence/analyze endpoints.
"""

import os
from typing import Dict, Any, Literal
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from ml.src.schemas import FEATURE_NAMES, validate_features
from ml.src.predict import predict_severity
from ml.src.pipeline.intelligence import run_intelligence_pipeline
from ml.service.schemas import IntelligenceAnalyzeRequest

app = FastAPI(
    title="RESQ ML Service",
    description="Machine Learning service housing the RESQ Severity Agent, Demand Forecasting, Needs Assessment, and OR-Tools Resource Allocation Engine.",
    version="1.0.0"
)


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "RESQ ML Service"
    version: str = "1.0.0"


class SeverityRequest(BaseModel):
    affected_population: float = Field(..., description="Estimated affected population count", json_schema_extra={"example": 4000.0})
    stranded_people: float = Field(..., description="Count of stranded/trapped people", json_schema_extra={"example": 120.0})
    water_level: float = Field(..., description="Normalized water level score [0.0, 1.0]", json_schema_extra={"example": 0.78})
    hospital_occupancy: float = Field(..., description="Hospital occupancy ratio [0.0, 1.0]", json_schema_extra={"example": 0.91})
    medical_cases: float = Field(..., description="Medical emergency count", json_schema_extra={"example": 65.0})
    road_blocked: float = Field(..., description="Binary road blockage flag (0 or 1)", json_schema_extra={"example": 1.0})
    sos_count: float = Field(..., description="Active SOS report count", json_schema_extra={"example": 5.0})
    shelter_occupancy: float = Field(..., description="Shelter occupancy ratio [0.0, 1.0]", json_schema_extra={"example": 0.68})
    food_shortage_ratio: float = Field(..., description="Food shortage ratio [0.0, 1.0]", json_schema_extra={"example": 0.30})
    water_shortage_ratio: float = Field(..., description="Water shortage ratio [0.0, 1.0]", json_schema_extra={"example": 0.45})
    disaster_duration_hours: float = Field(..., description="Hours since disaster start", json_schema_extra={"example": 7.0})
    population_vulnerability: float = Field(..., description="Population vulnerability ratio [0.0, 1.0]", json_schema_extra={"example": 0.72})

    @model_validator(mode="before")
    @classmethod
    def validate_exact_keys(cls, values: Any) -> Any:
        if isinstance(values, dict):
            extra_keys = [k for k in values.keys() if k not in FEATURE_NAMES]
            if extra_keys:
                raise ValueError(f"Unknown feature(s) rejected: {extra_keys}")
        return values


class SeverityResponse(BaseModel):
    severity_score: float = Field(..., description="Predicted continuous severity score [0.0, 1.0]")
    severity_level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"] = Field(..., description="Mapped severity level")
    model: str = Field(..., description="Model identifier used for inference")
    model_version: str = Field(..., description="Version of the model artifact")


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check() -> HealthResponse:
    """Returns the operational status of the ML service."""
    return HealthResponse()


@app.post(
    "/predict/severity",
    response_model=SeverityResponse,
    status_code=status.HTTP_200_OK,
    tags=["Inference"]
)
def predict_disaster_severity(request: SeverityRequest) -> SeverityResponse:
    """
    Accepts 12 operational features and returns predicted severity score and severity level.
    """
    payload = request.model_dump()
    try:
        result = predict_severity(payload)
        return SeverityResponse(**result)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )


@app.post(
    "/intelligence/analyze",
    status_code=status.HTTP_200_OK,
    tags=["Pipeline"]
)
def analyze_disaster_intelligence(request: IntelligenceAnalyzeRequest) -> Dict[str, Any]:
    """
    Accepts complete operational disaster state payload and runs the end-to-end ML Intelligence Pipeline:
    Feature Extraction -> XGBoost Severity -> Demand Forecast -> Needs Assessment -> OR-Tools Resource Allocation.
    """
    payload = request.model_dump()
    try:
        result = run_intelligence_pipeline(
            payload=payload,
            horizon=request.horizon,
            include_provenance=request.include_provenance
        )
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline execution error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_PORT", 8001))
    uvicorn.run("ml.service.main:app", host="0.0.0.0", port=port, reload=True)
