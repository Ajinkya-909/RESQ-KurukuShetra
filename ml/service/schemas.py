"""
FastAPI Pydantic Transport Schemas for RESQ ML Service endpoints.
"""

from typing import Dict, List, Any, Optional, Literal
from pydantic import BaseModel, Field, model_validator


class IntelligenceZone(BaseModel):
    zone_id: str = Field(..., description="Unique identifier for disaster zone", json_schema_extra={"example": "ZONE-FLOOD-C"})
    population_estimate: Optional[float] = Field(None, description="Estimated population count", json_schema_extra={"example": 15000})
    disaster_duration_hours: Optional[float] = Field(None, description="Duration of disaster in hours", json_schema_extra={"example": 18.0})
    population_vulnerability: Optional[float] = Field(None, description="Vulnerability score [0.0, 1.0]", json_schema_extra={"example": 0.80})


class IntelligenceReport(BaseModel):
    stranded_people: Optional[float] = Field(0.0, description="Stranded count in report", json_schema_extra={"example": 300})
    medical_cases: Optional[float] = Field(0.0, description="Medical cases in report", json_schema_extra={"example": 150})
    severity_signal: Optional[float] = Field(None, description="Report severity signal [0.0, 1.0]", json_schema_extra={"example": 0.95})


class IntelligenceHelpingPoint(BaseModel):
    helping_point_id: str = Field(..., description="Unique identifier for helping point", json_schema_extra={"example": "HP-DEPOT-ALPHA"})
    inventory: Dict[str, float] = Field(..., description="Resource inventory dictionary", json_schema_extra={"example": {"water": 400, "food": 200, "medical_kits": 50}})


class IntelligenceAnalyzeRequest(BaseModel):
    horizon: int = Field(3, description="Demand forecast horizon in hours [1..N]", json_schema_extra={"example": 3})
    include_provenance: bool = Field(False, description="Flag to include data provenance metadata", json_schema_extra={"example": False})
    zone: IntelligenceZone = Field(..., description="Disaster zone specifications")
    reports: List[Dict[str, Any]] = Field(default_factory=list, description="List of micro SOS field reports")
    operational_state: Dict[str, Any] = Field(default_factory=dict, description="Operational observations (water_level, road_blocked, etc.)")
    historical_demand: Dict[str, List[float]] = Field(default_factory=dict, description="Historical demand observations series")
    zone_inventory: Dict[str, float] = Field(default_factory=dict, description="Current local inventory within zone")
    helping_points: List[IntelligenceHelpingPoint] = Field(default_factory=list, description="Available supply nodes / helping points")

    @model_validator(mode="after")
    def validate_request_bounds(self) -> "IntelligenceAnalyzeRequest":
        if self.horizon < 1:
            raise ValueError(f"horizon must be positive integer >= 1, got: {self.horizon}")
        return self
