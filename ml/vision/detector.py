"""
detector.py — YOLO-based visual object detector for RESQ Visual Intelligence.

Analyzes field/disaster images and extracts structured visual evidence without modifying
or corrupting existing severity or resource allocation models.
"""

import os
import io
import time
import base64
from datetime import datetime, timezone
from typing import Dict, Any, Union, Optional
import cv2
import numpy as np
from PIL import Image

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    ULTRALYTICS_AVAILABLE = False


CONFIDENCE_THRESHOLD = float(os.getenv("VISION_CONFIDENCE_THRESHOLD", "0.40"))
YOLO_MODEL_NAME = os.getenv("VISION_MODEL", "yolov8n.pt")

_yolo_model = None

def get_yolo_model():
    global _yolo_model
    if _yolo_model is None and ULTRALYTICS_AVAILABLE:
        try:
            print(f"📷 [Vision] Loading YOLO pretrained checkpoint: {YOLO_MODEL_NAME}...")
            _yolo_model = YOLO(YOLO_MODEL_NAME)
        except Exception as e:
            print(f"⚠️ [Vision] Failed to load YOLO checkpoint '{YOLO_MODEL_NAME}': {e}")
            _yolo_model = None
    return _yolo_model


def _decode_image(image_input: Union[str, bytes, np.ndarray]) -> Optional[np.ndarray]:
    """Decodes string (file path or base64 data-url), bytes, or numpy array into OpenCV BGR image."""
    if isinstance(image_input, np.ndarray):
        return image_input

    if isinstance(image_input, bytes):
        nparr = np.frombuffer(image_input, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if isinstance(image_input, str):
        # Base64 data URI check
        if image_input.startswith("data:image/") or ";base64," in image_input:
            base64_data = image_input.split(";base64,")[-1]
            image_bytes = base64.b64decode(base64_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # File path check
        if os.path.exists(image_input):
            return cv2.imread(image_input)

    return None


def _draw_annotations(img_bgr: np.ndarray, detections: list) -> np.ndarray:
    """Draws bounding boxes, class names, and confidence scores on image."""
    annotated = img_bgr.copy()
    h, w, _ = annotated.shape

    colors = [
        (0, 215, 255),  # Gold/Yellow
        (255, 100, 0),  # Blue
        (0, 255, 127),  # Emerald Green
        (147, 20, 255), # Crimson Pink
        (255, 255, 0),  # Cyan
    ]

    for idx, det in enumerate(detections):
        bbox = det["bbox"]
        class_name = det["class_name"].upper()
        confidence = det["confidence"]
        
        x1, y1, x2, y2 = bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"]
        color = colors[idx % len(colors)]

        # Box border
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)

        # Label pill background & text
        label = f"{class_name} {int(confidence * 100)}%"
        (font_w, font_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        
        lbl_y1 = max(0, y1 - font_h - 10)
        lbl_y2 = max(font_h + 10, y1)
        
        cv2.rectangle(annotated, (x1, lbl_y1), (x1 + font_w + 12, lbl_y2), color, -1)
        cv2.putText(
            annotated,
            label,
            (x1 + 6, lbl_y2 - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 0, 0),
            2,
            cv2.LINE_AA
        )

    return annotated


def analyze_image(
    image_input: Union[str, bytes, np.ndarray],
    confidence_threshold: float = CONFIDENCE_THRESHOLD,
    return_annotated_base64: bool = True
) -> Dict[str, Any]:
    """
    Analyzes field image using pretrained YOLO model.
    Returns structured visual evidence payload.
    Does NOT change existing severity scores or resource allocations.
    """
    start_time = time.time()
    now_iso = datetime.now(timezone.utc).isoformat()

    img_bgr = _decode_image(image_input)
    if img_bgr is None:
        return {
            "success": False,
            "model": YOLO_MODEL_NAME,
            "detections": [],
            "error": "Invalid or unreadable image input",
            "analyzed_at": now_iso
        }

    h, w, _ = img_bgr.shape
    model = get_yolo_model()

    if model is None:
        return {
            "success": False,
            "model": "YOLO (Unavailable)",
            "detections": [],
            "image_width": w,
            "image_height": h,
            "error": "YOLO model unavailable or dependencies missing",
            "analyzed_at": now_iso
        }

    try:
        # Run inference
        results = model.predict(source=img_bgr, conf=confidence_threshold, verbose=False)
        detections = []

        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes
            names = result.names

            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()

                class_name = names.get(cls_id, f"object_{cls_id}")
                detections.append({
                    "class_name": str(class_name),
                    "confidence": round(conf, 4),
                    "bbox": {
                        "x1": int(xyxy[0]),
                        "y1": int(xyxy[1]),
                        "x2": int(xyxy[2]),
                        "y2": int(xyxy[3])
                    }
                })

        annotated_bgr = _draw_annotations(img_bgr, detections)

        annotated_base64 = None
        if return_annotated_base64:
            _, buffer = cv2.imencode(".jpg", annotated_bgr)
            annotated_base64 = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

        return {
            "success": True,
            "model": f"YOLO ({YOLO_MODEL_NAME})",
            "detections": detections,
            "image_width": w,
            "image_height": h,
            "annotated_image": annotated_base64,
            "analyzed_at": now_iso,
            "inference_time_ms": round((time.time() - start_time) * 1000, 2)
        }
    except Exception as e:
        print(f"❌ [Vision] Inference error: {e}")
        return {
            "success": False,
            "model": YOLO_MODEL_NAME,
            "detections": [],
            "image_width": w,
            "image_height": h,
            "error": f"YOLO inference error: {str(e)}",
            "analyzed_at": now_iso
        }
