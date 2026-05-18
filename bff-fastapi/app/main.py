from fastapi import FastAPI, HTTPException
from app.schemas import AnalyzeFoodRequest, AnalyzeFoodResponse
from app.services.vision_service import analyze_with_provider


app = FastAPI(title="FoodLens Advisor BFF", version="0.1.0")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/api/v1/analyze-food", response_model=AnalyzeFoodResponse)
async def analyze_food(req: AnalyzeFoodRequest) -> AnalyzeFoodResponse:
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    try:
        return await analyze_with_provider(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"analysis failed: {exc}") from exc
