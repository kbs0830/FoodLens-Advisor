from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional, cast


class AnalyzeFoodRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 image payload")
    locale: str = Field(default="zh-TW")


class DetectFoodRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 image payload")
    locale: str = Field(default="zh-TW")
    detector_build: Optional[str] = Field(default=None, description="前端檢測器版本")


class DetectionMeta(BaseModel):
    detection_count: int = Field(default=0, description="檢測數量")
    average_confidence: float = Field(default=0.0, description="平均信心度")


class DetectionItem(BaseModel):
    item: str = Field(..., description="偵測到的食物名稱")
    confidence: float = Field(..., description="信心度")
    source: str = Field(default="yolo", description="來源模型")


class DetectFoodResponse(BaseModel):
    food_items: List[str]
    confidence_scores: List[float] = Field(default_factory=lambda: cast(List[float], []))
    description: str
    detection_count: int
    raw_detections: List[DetectionItem] = Field(default_factory=lambda: cast(List[DetectionItem], []))
    model_name: str = Field(default="", description="模型名稱")
    model_source: str = Field(default="", description="模型來源")
    note: str = Field(default="", description="備註")


class AnalyzeTextRequest(BaseModel):
    """新增: YOLO 檢測結果文字分析請求"""
    food_items: List[str] = Field(..., description="檢測到的食物清單")
    description: str = Field(..., description="YOLO 檢測描述")
    locale: str = Field(default="zh-TW")
    detector_build: Optional[str] = Field(default=None, description="前端檢測器版本")
    detection_meta: Optional[DetectionMeta] = Field(default=None, description="檢測統計")


class MacroNutrients(BaseModel):
    protein_g: float
    carbs_g: float
    fat_g: float


class DietaryRuleCheck(BaseModel):
    high_protein: bool
    zero_starch: bool
    zero_alcohol: bool
    mild_not_spicy: bool


class AnalyzeFoodResponse(BaseModel):
    food_items: List[str]
    estimated_calories_kcal: float
    macros: MacroNutrients
    rule_check: DietaryRuleCheck
    ai_conclusion: str = Field(default="", description="AI 結語")
    next_meal_suggestion: str
    next_meal_options: List[str] = Field(default_factory=list, description="更多餐點建議")
    nutrition_tips: List[str] = Field(default_factory=list, description="營養提示")
    diet_warnings: List[str] = Field(default_factory=list, description="注意事項")
    confidence_note: str = Field(default="", description="可信度提示")
