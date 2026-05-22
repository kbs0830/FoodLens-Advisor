import os
import json
from app.schemas import AnalyzeFoodRequest, AnalyzeTextRequest, AnalyzeFoodResponse, DietaryRuleCheck, MacroNutrients


SYSTEM_PROMPT = (
    "你是一位嚴格的飲食分析助理。"
    "請檢查餐點是否符合高蛋白、零澱粉、零酒精、清淡不辣。"
    "輸出必須是可解析 JSON。"
)

YOLO_TEXT_SYSTEM_PROMPT = (
    "你是一位專業的營養分析師。"
    "根據 YOLO 檢測到的食物清單和描述，分析這餐的營養成分和飲食符合度。"
    "請提供以下資訊："
    "1. 食物清單"
    "2. 預估熱量 (kcal)"
    "3. 巨量營養素 (蛋白質g, 碳水g, 脂肪g)"
    "4. 飲食規則檢查 (高蛋白, 零澱粉, 零酒精, 清淡不辣)"
    "5. 下一餐建議"
    "輸出必須是有效的 JSON 格式。"
)


def _get_gemini_client():
    """初始化 Gemini API 客戶端"""
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        return genai
    except ImportError:
        return None


async def analyze_with_provider(req: AnalyzeFoodRequest) -> AnalyzeFoodResponse:
    """原始的圖像分析功能（保持相容性）"""
    provider = os.getenv("VISION_PROVIDER", "mock").lower()

    if provider == "gemini":
        return await _analyze_with_gemini(req.image_base64)
    
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


async def _analyze_with_gemini(image_base64: str) -> AnalyzeFoodResponse:
    """使用 Gemini Vision API 分析圖像"""
    import base64
    
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise Exception("缺少 GEMINI_API_KEY")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro-vision')
        
        # 解碼 base64 圖像
        image_data = base64.b64decode(image_base64)
        
        # 構建提示
        prompt = (
            "請分析這張食物照片，並返回 JSON 格式的結果。"
            "JSON 應包含以下字段："
            "{"
            '"food_items": ["食物1", "食物2", ...], '
            '"estimated_calories_kcal": 數字, '
            '"protein_g": 蛋白質克數, '
            '"carbs_g": 碳水克數, '
            '"fat_g": 脂肪克數, '
            '"high_protein": 布爾值, '
            '"zero_starch": 布爾值, '
            '"zero_alcohol": 布爾值, '
            '"mild_not_spicy": 布爾值, '
            '"next_meal_suggestion": "建議文字"'
            "}"
        )
        
        # 調用 API
        response = model.generate_content([
            {"mime_type": "image/jpeg", "data": image_data},
            prompt
        ])
        
        # 解析響應
        text = response.text
        # 從 markdown 代碼塊中提取 JSON
        if "```json" in text:
            json_str = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            json_str = text.split("```")[1].split("```")[0].strip()
        else:
            json_str = text
        
        data = json.loads(json_str)
        
        return AnalyzeFoodResponse(
            food_items=data.get("food_items", []),
            estimated_calories_kcal=float(data.get("estimated_calories_kcal", 0)),
            macros=MacroNutrients(
                protein_g=float(data.get("protein_g", 0)),
                carbs_g=float(data.get("carbs_g", 0)),
                fat_g=float(data.get("fat_g", 0))
            ),
            rule_check=DietaryRuleCheck(
                high_protein=bool(data.get("high_protein", False)),
                zero_starch=bool(data.get("zero_starch", False)),
                zero_alcohol=bool(data.get("zero_alcohol", True)),
                mild_not_spicy=bool(data.get("mild_not_spicy", True))
            ),
            next_meal_suggestion=data.get("next_meal_suggestion", "")
        )
    
    except Exception as e:
        print(f"Gemini 分析失敗: {e}")
        raise


async def analyze_text_with_ai(req: AnalyzeTextRequest) -> AnalyzeFoodResponse:
    """新增: 使用 YOLO 檢測結果進行文字分析
    
    此功能使用 YOLO 前端檢測的文字結果，而非圖像。
    大幅降低 token 消耗 (~5000x)
    
    若食物列表為空，提供 mock 數據作為回退
    """
    try:
        # 若食物列表為空，使用 mock 數據
        if not req.food_items or len(req.food_items) == 0:
            print("[WARN] 食物列表為空，使用 Mock 數據作為回退")
            return _create_analysis_response(["chicken breast", "broccoli"])
        
        provider = os.getenv("AI_PROVIDER", os.getenv("VISION_PROVIDER", "mock")).lower()
        print(f"[INFO] AI_PROVIDER: {provider}")

        # 構建食物描述字符串
        food_str = ", ".join(req.food_items)
        full_prompt = f"檢測到的食物: {food_str}\n\n{req.description}"

        if provider == "gemini":
            try:
                return await _analyze_text_with_gemini(req.food_items, full_prompt)
            except Exception as gemini_error:
                print(f"[WARN] Gemini 分析失敗: {gemini_error}，回退到 Mock")
                return _create_analysis_response(req.food_items)

        if provider == "mock":
            # Mock 分析結果
            return _create_analysis_response(req.food_items)

        # 預設回退到 mock
        print(f"[WARN] 未知的 provider: {provider}，回退到 Mock")
        return _create_analysis_response(req.food_items)
    
    except Exception as e:
        print(f"[ERROR] analyze_text_with_ai 發生錯誤: {e}")
        print(f"[ERROR] 錯誤類型: {type(e)}")
        import traceback
        traceback.print_exc()
        # 最後的回退
        return _create_analysis_response(["chicken breast", "broccoli"])


async def _analyze_text_with_gemini(food_items: list, description: str) -> AnalyzeFoodResponse:
    """使用 Gemini 進行文字分析"""
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise Exception("缺少 GEMINI_API_KEY")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        
        prompt = (
            f"{YOLO_TEXT_SYSTEM_PROMPT}\n\n"
            f"檢測到的食物清單: {', '.join(food_items)}\n"
            f"描述: {description}\n\n"
            "請返回 JSON 格式的分析結果。"
        )
        
        print(f"[INFO] 發送到 Gemini: {prompt[:100]}...")
        response = model.generate_content(prompt)
        text = response.text
        print(f"[INFO] Gemini 響應: {text[:100]}...")
        
        # 從 markdown 代碼塊中提取 JSON
        if "```json" in text:
            json_str = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            json_str = text.split("```")[1].split("```")[0].strip()
        else:
            json_str = text
        
        data = json.loads(json_str)
        
        return AnalyzeFoodResponse(
            food_items=data.get("food_items", food_items),
            estimated_calories_kcal=float(data.get("estimated_calories_kcal", 0)),
            macros=MacroNutrients(
                protein_g=float(data.get("protein_g", 0)),
                carbs_g=float(data.get("carbs_g", 0)),
                fat_g=float(data.get("fat_g", 0))
            ),
            rule_check=DietaryRuleCheck(
                high_protein=bool(data.get("high_protein", False)),
                zero_starch=bool(data.get("zero_starch", False)),
                zero_alcohol=bool(data.get("zero_alcohol", True)),
                mild_not_spicy=bool(data.get("mild_not_spicy", True))
            ),
            next_meal_suggestion=data.get("next_meal_suggestion", "")
        )
    
    except Exception as e:
        print(f"[ERROR] Gemini 文字分析失敗: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise


def _create_analysis_response(food_items: list) -> AnalyzeFoodResponse:
    """根據食物清單生成分析結果"""
    
    # 簡單的營養數據庫（用於 demo）
    nutrition_db = {
        "chicken": {"cal": 165, "protein": 31, "carbs": 0, "fat": 3.6},
        "breast": {"cal": 165, "protein": 31, "carbs": 0, "fat": 3.6},
        "broccoli": {"cal": 34, "protein": 2.8, "carbs": 7, "fat": 0.4},
        "rice": {"cal": 130, "protein": 2.7, "carbs": 28, "fat": 0.3},
        "beef": {"cal": 250, "protein": 26, "carbs": 0, "fat": 15},
        "fish": {"cal": 100, "protein": 20, "carbs": 0, "fat": 1.3},
        "egg": {"cal": 155, "protein": 13, "carbs": 1.1, "fat": 11},
        "bread": {"cal": 265, "protein": 9, "carbs": 49, "fat": 3.3},
        "milk": {"cal": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3},
        "cheese": {"cal": 402, "protein": 25, "carbs": 1.3, "fat": 33},
        "potato": {"cal": 77, "protein": 2, "carbs": 17, "fat": 0.1},
        "tomato": {"cal": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2},
        "lettuce": {"cal": 15, "protein": 1.2, "carbs": 2.9, "fat": 0.2},
        "apple": {"cal": 52, "protein": 0.3, "carbs": 14, "fat": 0.2},
        "banana": {"cal": 89, "protein": 1.1, "carbs": 23, "fat": 0.3},
        "orange": {"cal": 47, "protein": 0.9, "carbs": 12, "fat": 0.3},
    }

    # 計算營養總量
    total_cal = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0

    for item in food_items:
        item_lower = item.lower()
        # 逐字尋找匹配
        for key, nutrition in nutrition_db.items():
            if key in item_lower:
                total_cal += nutrition["cal"]
                total_protein += nutrition["protein"]
                total_carbs += nutrition["carbs"]
                total_fat += nutrition["fat"]
                break

    # 檢查飲食規則
    rule_check = DietaryRuleCheck(
        high_protein=total_protein >= 30,  # 蛋白質 >= 30g
        zero_starch=total_carbs == 0,  # 碳水 = 0
        zero_alcohol=True,  # 通常沒有酒精（簡化）
        mild_not_spicy=not any(x in str(food_items).lower() for x in ["chili", "pepper", "spicy"]),
    )

    # 生成建議
    suggestion = _generate_suggestion(rule_check, total_protein, total_carbs)

    return AnalyzeFoodResponse(
        food_items=food_items,
        estimated_calories_kcal=total_cal if total_cal > 0 else 300,
        macros=MacroNutrients(
            protein_g=total_protein if total_protein > 0 else 25,
            carbs_g=total_carbs,
            fat_g=total_fat if total_fat > 0 else 10
        ),
        rule_check=rule_check,
        next_meal_suggestion=suggestion,
    )


def _generate_suggestion(rule_check: DietaryRuleCheck, protein: float, carbs: float) -> str:
    """根據飲食規則生成建議"""
    suggestions = []

    if not rule_check.high_protein:
        suggestions.append("增加蛋白質攝取，建議補充雞蛋、肉類或豆類。")

    if not rule_check.zero_starch:
        suggestions.append("降低碳水化合物攝取，减少米飯、麵包等澱粉類食物。")

    if not rule_check.mild_not_spicy:
        suggestions.append("下一餐選擇清淡食物，避免過辣刺激。")

    if not suggestions:
        suggestions.append("很好！這餐符合所有飲食目標，請繼續保持。")

    return " ".join(suggestions)
