import base64
import io
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, cast

from dotenv import load_dotenv
from PIL import Image
from ultralytics import YOLO

from app.schemas import DetectFoodRequest, DetectFoodResponse, DetectionItem


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


DEFAULT_YOLO_CONF_THRESHOLD = 0.18


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


YOLO_LABEL_ALIASES = {
    "dishqozonkabob": "kebab",
    "dishxonim": "layer cake",
    "dishshashlik": "shashlik",
    "dishsomsa": "samosa",
    "ingkokat": "greens",
    "ingkartoshka-pure": "mashed potato",
    "ingtovuq-goshti": "chicken",
    "ingguruch": "rice",
    "dishunknown": "unknown",
    "dishmanti": "manti",
    "ingpiyoz": "onion",
    "inggosht": "beef",
    "ingpomidor": "tomato",
    "ingnoxat": "peas",
    "ingkartoshka": "potato",
    "dishshorva": "soup",
    "ingtuxum": "egg",
    "dishosh": "pilaf",
    "ingbodring": "cucumber",
    "ingsous": "sauce",
    "dishnorin": "nori",
    "dishlagmon": "lagman",
    "inganor": "pomegranate",
    "dishbilinchik": "blinchik",
    "dishdolma": "dolma",
    "ingqalampir": "pepper",
    "dishmoshkichra": "mashkichiri",
    "dishnoxatshorva": "chickpea soup",
    "dishtokdolma": "stuffed vine leaves",
    "ingdolma": "dolma",
    "ingkatlet": "cutlet",
    "ingpishloq": "cheese",
    "ingsosiska": "sausage",
    "ingmakaron": "macaroni",
    "disholivye": "olivier salad",
    "ingmakkajoxori": "corn",
    "ingikra": "caviar",
    "ingsalat": "salad",
    "ingteftel": "meatball",
    "ingshashlik": "shashlik",
    "inggolupsi": "cabbage rolls",
    "dishpojarskiy-kotleti": "pozharskiy cutlet",
    "ingsabzi": "carrot",
    "dishqovurmamakaron": "fried macaroni",
    "dishjarkop": "jarkop stew",
    "ingloviya": "beans",
    "ingteftel": "meatball",
    "ingtovuq-goshti": "chicken",
    "ingguruch": "rice",
    "ingkartoshka": "potato",
    "ingkartoshka-pure": "mashed potato",
    "ingpishloq": "cheese",
    "ingsabzi": "carrot",
    "ingpomidor": "tomato",
    "ingbodring": "cucumber",
    "ingtuxum": "egg",
    "ingdolma": "dolma",
    "inggolupsi": "cabbage rolls",
    "ingshashlik": "shashlik",
    "ingmakkaron": "macaroni",
    "ingsalat": "salad",
    "ingteftel": "meatball",
}


def _decode_image(image_base64: str) -> Image.Image:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def _normalize_food_label(label: str) -> str:
    normalized = label.lower().strip()
    return YOLO_LABEL_ALIASES.get(normalized, normalized)


def _get_weights_path() -> str:
    raw_path = os.getenv("YOLO_WEIGHTS_PATH", "yolov8n.pt").strip()
    if not raw_path or raw_path == "yolov8n.pt":
        return "yolov8n.pt"

    weights_path = Path(raw_path)
    if not weights_path.is_absolute():
        weights_path = Path(__file__).resolve().parents[2] / weights_path
    return str(weights_path)


def _get_conf_threshold() -> float:
    raw_value = os.getenv("YOLO_CONF_THRESHOLD", str(DEFAULT_YOLO_CONF_THRESHOLD)).strip()
    try:
        threshold = float(raw_value)
    except ValueError:
        threshold = DEFAULT_YOLO_CONF_THRESHOLD
    return max(0.01, min(threshold, 0.99))


@lru_cache(maxsize=1)
def _load_model() -> YOLO:
    return YOLO(_get_weights_path())


def _get_model_classes(model: YOLO) -> List[str]:
    names = getattr(model, "names", {})
    if isinstance(names, dict):
        typed_names = cast(Dict[int, str], names)
        return [typed_names[index] for index in sorted(typed_names.keys())]
    if isinstance(names, list):
        typed_names = cast(List[str], names)
        return [str(name) for name in typed_names]
    return []


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
    weights_path = _get_weights_path()
    custom_model = weights_path != "yolov8n.pt"
    conf_threshold = _get_conf_threshold()

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
            display_name = _normalize_food_label(class_name)
            confidence = float(box.conf.item())

            if not _is_food_class(class_name, custom_model):
                continue

            detections.append(
                DetectionItem(
                    item=display_name,
                    confidence=round(confidence, 2),
                    source="yolo",
                )
            )

    detections.sort(key=lambda item: item.confidence, reverse=True)
    food_items: List[str] = [item.item for item in detections]
    confidence_scores: List[float] = [item.confidence for item in detections]
    average_confidence = round(sum(confidence_scores) / len(confidence_scores), 2) if confidence_scores else 0.0

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
        model_name=Path(weights_path).name,
        model_path=weights_path,
        model_classes=_get_model_classes(model),
        model_source="ultralytics",
        confidence_threshold=round(conf_threshold, 2),
        average_confidence=average_confidence,
        note=(
            "使用自訂食物模型"
            if custom_model
            else "目前使用通用 YOLOv8n，若要更準請設定 YOLO_WEIGHTS_PATH 指向食物專用權重"
        ),
    )