import os
from app.schemas import AnalyzeFoodRequest, AnalyzeFoodResponse, DietaryRuleCheck, MacroNutrients


SYSTEM_PROMPT = (
    "你是一位嚴格的飲食分析助理。"
    "請檢查餐點是否符合高蛋白、零澱粉、零酒精、清淡不辣。"
    "輸出必須是可解析 JSON。"
)


async def analyze_with_provider(req: AnalyzeFoodRequest) -> AnalyzeFoodResponse:
    provider = os.getenv("VISION_PROVIDER", "mock").lower()

    if provider == "mock":
        return AnalyzeFoodResponse(
            food_items=["chicken breast", "broccoli"],
            estimated_calories_kcal=312.0,
            macros=MacroNutrients(protein_g=48.0, carbs_g=8.0, fat_g=9.0),
            rule_check=DietaryRuleCheck(
                high_protein=True,
                zero_starch=False,
                zero_alcohol=True,
                mild_not_spicy=True,
            ),
            next_meal_suggestion="下一餐可增加葉菜類與水分，維持蛋白質攝取。",
        )

    # TODO: Integrate OpenAI / Gemini Vision API with SYSTEM_PROMPT.
    # Keep API keys only on server-side env vars.
    return AnalyzeFoodResponse(
        food_items=[],
        estimated_calories_kcal=0,
        macros=MacroNutrients(protein_g=0, carbs_g=0, fat_g=0),
        rule_check=DietaryRuleCheck(
            high_protein=False,
            zero_starch=False,
            zero_alcohol=True,
            mild_not_spicy=True,
        ),
        next_meal_suggestion="尚未設定供應商，請先配置 VISION_PROVIDER 與 API Key。",
    )
