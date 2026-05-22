import os
import sys

if __name__ == "__main__" and __package__ is None:
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI, HTTPException
from app.schemas import AnalyzeFoodRequest, AnalyzeTextRequest, AnalyzeFoodResponse
from app.services.vision_service import analyze_with_provider, analyze_text_with_ai


app = FastAPI(title="FoodLens Advisor BFF", version="0.2.0")


@app.get("/health")
async def health() -> dict:
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=False)
