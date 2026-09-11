"""
Pydantic schemas for RESQ Visual Intelligence YOLO detector contract.
"""

from typing import List, Optional
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

class VisualDetection(BaseModel):
    class_name: str
    confidence: float
    bbox: BoundingBox

class VisualAnalysisResponse(BaseModel):
    success: bool
    model: str = "YOLOv8n"
    detections: List[VisualDetection] = Field(default_factory=list)
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    annotated_image: Optional[str] = None  # Base64 string or file path
    analyzed_at: Optional[str] = None
    error: Optional[str] = None
