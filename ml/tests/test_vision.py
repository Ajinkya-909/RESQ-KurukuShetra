"""
Unit tests for RESQ Visual Intelligence YOLO detector module.
"""

import os
import pytest
import numpy as np
import cv2
from ml.vision.detector import analyze_image, _decode_image, _draw_annotations

def test_analyze_image_valid_numpy():
    # Create a 640x480 RGB image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Draw a colored rectangle resembling an object
    cv2.rectangle(img, (100, 100), (300, 300), (0, 255, 0), -1)
    
    result = analyze_image(img, confidence_threshold=0.25)
    assert result["success"] is True
    assert "model" in result
    assert result["image_width"] == 640
    assert result["image_height"] == 480
    assert "detections" in result
    assert isinstance(result["detections"], list)
    assert "analyzed_at" in result

def test_analyze_image_invalid_input():
    result = analyze_image("non_existent_file_path_123.jpg")
    assert result["success"] is False
    assert result["error"] == "Invalid or unreadable image input"
    assert result["detections"] == []

def test_analyze_image_base64_decoding():
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img)
    import base64
    b64_str = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
    
    result = analyze_image(b64_str)
    assert result["success"] is True
    assert result["image_width"] == 100
    assert result["image_height"] == 100

def test_draw_annotations_bounding_box():
    img = np.zeros((400, 400, 3), dtype=np.uint8)
    detections = [
        {
            "class_name": "person",
            "confidence": 0.88,
            "bbox": {"x1": 50, "y1": 50, "x2": 150, "y2": 200}
        }
    ]
    annotated = _draw_annotations(img, detections)
    assert annotated.shape == img.shape
    # Image should not be identical (pixels drawn)
    assert not np.array_equal(annotated, img)

def test_vision_api_endpoint():
    from fastapi.testclient import TestClient
    from ml.service.main import app
    client = TestClient(app)
    
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img)
    import base64
    b64_str = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
    
    response = client.post("/vision/analyze", json={"image_input": b64_str, "confidence_threshold": 0.30})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "detections" in data

