import os
import sys
from pathlib import Path

from dotenv import load_dotenv

if __name__ == "__main__" and __package__ is None:
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import (
    AnalyzeFoodRequest,
    AnalyzeTextRequest,
    AnalyzeFoodResponse,
    DetectFoodRequest,
    DetectFoodResponse,
)
from app.services.detection_service import detect_food_from_image
from app.services.vision_service import analyze_with_provider, analyze_text_with_ai
from app.services.food_classifier import classify_food_from_base64
from app.schemas import ClassifyFoodRequest, ClassifyFoodResponse


app = FastAPI(title="FoodLens Advisor BFF", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/analyze-food", response_model=AnalyzeFoodResponse)
async def analyze_food(req: AnalyzeFoodRequest) -> AnalyzeFoodResponse:
    """原始的圖像分析端點（保持相容性）"""
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    try:
        return await analyze_with_provider(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"analysis failed: {exc}") from exc


@app.post("/api/v1/detect-food", response_model=DetectFoodResponse)
async def detect_food(req: DetectFoodRequest) -> DetectFoodResponse:
    """使用 YOLO 偵測圖片中的食物"""
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    try:
        return detect_food_from_image(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"detection failed: {exc}") from exc


@app.post("/api/v1/analyze-text", response_model=AnalyzeFoodResponse)
async def analyze_text(req: AnalyzeTextRequest) -> AnalyzeFoodResponse:
    """新增: YOLO 檢測結果文字分析端點
    
    輸入: 前端 YOLO 檢測的食物清單和描述
    輸出: 營養分析和飲食建議
    
    優勢:
    - Token 消耗 5000 倍降低 (文字 vs Base64 圖像)
    - 更快的響應速度
    - 保護隱私 (圖像不上傳)
    
    備註: 若食物列表為空，將使用 mock 數據作為回退
    """
    try:
        return await analyze_text_with_ai(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"analysis failed: {exc}") from exc


@app.post("/api/v1/classify-food", response_model=ClassifyFoodResponse)
async def classify_food(req: ClassifyFoodRequest) -> ClassifyFoodResponse:
    """使用伺服器端食物分類模型（Food-101 預訓練或回退模型）"""
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    try:
        results, model_name, note = classify_food_from_base64(req.image_base64, topk=5)
        food_items = [r[0] for r in results]
        confidence_scores = [round(r[1], 4) for r in results]
        description = "; ".join(f"{i} ({int(p*100)}%)" for i, p in results)
        from typing import List, Dict, Union
        topk: List[Dict[str, Union[str, float]]] = [{"label": r[0], "confidence": round(r[1], 4)} for r in results]

        return ClassifyFoodResponse(
            food_items=food_items,
            confidence_scores=confidence_scores,
            description=description,
            topk=topk,
            model_name=model_name,
            note=note,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"classification failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=False)
