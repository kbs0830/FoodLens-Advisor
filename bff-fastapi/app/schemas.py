from pydantic import BaseModel, Field
from typing import List


class AnalyzeFoodRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 image payload")
    locale: str = Field(default="zh-TW")


class AnalyzeTextRequest(BaseModel):
    """新增: YOLO 檢測結果文字分析請求"""
    food_items: List[str] = Field(..., description="檢測到的食物清單")
    description: str = Field(..., description="YOLO 檢測描述")
    locale: str = Field(default="zh-TW")


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
    next_meal_suggestion: str
