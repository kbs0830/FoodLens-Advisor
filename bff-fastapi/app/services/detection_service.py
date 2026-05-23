import base64
import io
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional, Protocol, cast

from PIL import Image
from ultralytics import YOLO

from app.schemas import DetectFoodRequest, DetectFoodResponse, DetectionItem


FOOD_KEYWORDS = {
    "apple",
    "banana",
    "orange",
    "carrot",
    "broccoli",
    "chicken",
    "beef",
    "fish",
    "bread",
    "rice",
    "egg",
    "milk",
    "cheese",
    "potato",
    "tomato",
    "lettuce",
    "cucumber",
    "pizza",
    "sandwich",
    "salad",
    "soup",
    "noodles",
    "steak",
    "pork",
    "shrimp",
    "crab",
    "lobster",
    "pepperoni",
    "spaghetti",
    "burger",
    "hot dog",
    "donut",
    "cake",
    "cookie",
    "coffee",
    "tea",
    "wine glass",
    "beer glass",
}


FOOD_NAME_HINTS = (
    "food",
    "fruit",
    "vegetable",
    "meat",
    "dish",
    "meal",
    "snack",
    "drink",
    "dessert",
    "cuisine",
    "restaurant",
)


def _decode_image(image_base64: str) -> Image.Image:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


@lru_cache(maxsize=1)
def _load_model() -> YOLO:
    weights_path = os.getenv("YOLO_WEIGHTS_PATH", "yolov8n.pt")
    return YOLO(weights_path)


class _BoxLike(Protocol):
    cls: Any
    conf: Any


class _ResultLike(Protocol):
    names: Dict[int, str]
    boxes: Optional[List[_BoxLike]]


def _is_food_class(class_name: str, custom_model: bool) -> bool:
    normalized = class_name.lower().strip()
    if custom_model:
        return True
    if normalized in FOOD_KEYWORDS:
        return True
    return any(hint in normalized for hint in FOOD_NAME_HINTS)


def detect_food_from_image(req: DetectFoodRequest) -> DetectFoodResponse:
    image = _decode_image(req.image_base64)
    model = _load_model()
    model_any = cast(Any, model)
    custom_model = os.getenv("YOLO_WEIGHTS_PATH", "yolov8n.pt") != "yolov8n.pt"
    conf_threshold = float(os.getenv("YOLO_CONF_THRESHOLD", "0.25"))

    results: List[Any] = model_any.predict(source=image, conf=conf_threshold, verbose=False)
    # Cast the third-party result to our local protocol for type checking
    result = cast(_ResultLike, results[0])

    detections: List[DetectionItem] = []
    names: Dict[int, str] = result.names if hasattr(result, "names") else getattr(model, "names", {})

    boxes: Optional[List[_BoxLike]] = getattr(result, "boxes", None)
    if boxes is not None:
        for box in boxes:
            class_id = int(box.cls.item())
            class_name = str(names.get(class_id, f"class_{class_id}"))
            confidence = float(box.conf.item())

            if not _is_food_class(class_name, custom_model):
                continue

            detections.append(
                DetectionItem(
                    item=class_name.lower(),
                    confidence=round(confidence, 2),
                    source="yolo",
                )
            )

    detections.sort(key=lambda item: item.confidence, reverse=True)
    food_items: List[str] = [item.item for item in detections]
    confidence_scores: List[float] = [item.confidence for item in detections]

    if food_items:
        description = "檢測到: " + ", ".join(
            f"{item.item} ({int(item.confidence * 100)}% 信心度)" for item in detections[:5]
        )
    else:
        description = "無法識別食物，請嘗試上傳更清晰的圖像。"

    return DetectFoodResponse(
        food_items=food_items,
        confidence_scores=confidence_scores,
        description=description,
        detection_count=len(detections),
        raw_detections=detections,
        model_name=str(os.getenv("YOLO_WEIGHTS_PATH", "yolov8n.pt")),
        model_source="ultralytics",
        note=(
            "使用自訂食物模型" if custom_model else "目前使用通用 YOLOv8n，若要更準請設定 YOLO_WEIGHTS_PATH 指向食物專用權重"
        ),
    )