import os
import json
from typing import Any, Dict, List, Optional, cast
from app.schemas import AnalyzeFoodRequest, AnalyzeTextRequest, AnalyzeFoodResponse, DietaryRuleCheck, MacroNutrients


SYSTEM_PROMPT = (
    "你是一位嚴格的飲食分析助理。"
    "請檢查餐點是否符合高蛋白、零澱粉、零酒精、清淡不辣。"
    "輸出必須是可解析 JSON。"
)

YOLO_TEXT_SYSTEM_PROMPT = (
    "你是一位專業的營養分析師。"
    "根據 YOLO 檢測到的食物清單和描述，分析這餐的營養成分與飲食符合度。"
    "請回傳 JSON，不要輸出 Markdown 或多餘文字。"
    "JSON 必須包含以下欄位："
    "food_items, estimated_calories_kcal, macros, rule_check, ai_conclusion, "
    "next_meal_suggestion, next_meal_options, nutrition_tips, diet_warnings, confidence_note。"
    "macros 需包含 protein_g, carbs_g, fat_g。"
    "rule_check 需包含 high_protein, zero_starch, zero_alcohol, mild_not_spicy。"
)


def _build_ai_conclusion(food_items: List[str], rule_check: DietaryRuleCheck, source: str) -> str:
    if rule_check.high_protein and rule_check.zero_starch and rule_check.zero_alcohol and rule_check.mild_not_spicy:
        return f"{source} 判斷：這餐整體結構非常符合飲食目標，可作為高蛋白低負擔餐的良好範例。"

    summary_parts: List[str] = []
    if not rule_check.high_protein:
        summary_parts.append("蛋白質仍可再提高")
    if not rule_check.zero_starch:
        summary_parts.append("碳水略高")
    if not rule_check.mild_not_spicy:
        summary_parts.append("口味可能偏刺激")
    if rule_check.zero_alcohol:
        summary_parts.append("未見酒精風險")

    summary = "、".join(summary_parts) if summary_parts else "整體平衡"
    food_preview = "、".join(food_items[:3]) if food_items else "本餐內容"
    return f"{source} 結語：{food_preview} 的營養結構屬於 {summary}，建議下一餐補強蔬菜與蛋白質平衡。"


def _confidence_note_from_meta(req: AnalyzeTextRequest) -> str:
    if not req.detection_meta:
        return ""

    count = req.detection_meta.detection_count
    avg_conf = req.detection_meta.average_confidence
    if count == 0:
        return "檢測到的食物數量為 0，建議提供更清晰或更近的食物照片。"
    if avg_conf < 0.35:
        return "整體信心度偏低，建議補充更清楚的圖片或手動確認食物名稱。"
    if avg_conf < 0.55:
        return "整體信心度中等，建議以實際餐點為主並做人工校正。"
    return ""


def _extract_json(text: str) -> Dict[str, Any]:
    if "```json" in text:
        json_str = text.split("```json")[1].split("```", 1)[0].strip()
    elif "```" in text:
        json_str = text.split("```")[1].split("```", 1)[0].strip()
    else:
        json_str = text.strip()

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return {}


def _ensure_list(value: Any) -> List[str]:
    if isinstance(value, list):
        entries = cast(List[Any], value)
        return [str(item) for item in entries if item]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _get_gemini_client() -> Optional[Any]:
    """初始化 Gemini API 客戶端

    使用 importlib 載入以降低 Pylance 的私有匯入警告。
    回傳 Any（或 None 若未安裝或未設定 API key）。
    """
    try:
        import importlib

        genai = importlib.import_module("google.generativeai")  # type: ignore[reportPrivateImportUsage]
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None
        # configure 可能為私有匯出，透過 getattr 呼叫
        getattr(genai, "configure")(api_key=api_key)  # type: ignore[arg-type]
        return genai
    except ImportError:
        return None


async def analyze_with_provider(req: AnalyzeFoodRequest) -> AnalyzeFoodResponse:
    """原始的圖像分析功能（保持相容性）"""
    provider = os.getenv("VISION_PROVIDER", "mock").lower()

    if provider == "gemini":
        return await _analyze_with_gemini(req.image_base64)
    
    if provider == "mock":
        rule_check = DietaryRuleCheck(
            high_protein=True,
            zero_starch=False,
            zero_alcohol=True,
            mild_not_spicy=True,
        )
        return AnalyzeFoodResponse(
            food_items=["chicken breast", "broccoli"],
            estimated_calories_kcal=312.0,
            macros=MacroNutrients(protein_g=48.0, carbs_g=8.0, fat_g=9.0),
            rule_check=rule_check,
            ai_conclusion=_build_ai_conclusion(["chicken breast", "broccoli"], rule_check, "Mock"),
            next_meal_suggestion="下一餐可增加葉菜類與水分，維持蛋白質攝取。",
            next_meal_options=[
                "雞胸 + 燙青菜 + 菇類",
                "豆腐 + 涼拌海帶芽 + 雞蛋",
                "鮭魚 + 時蔬 + 味噌湯",
            ],
            nutrition_tips=[
                "蛋白質充足時，可搭配高纖蔬菜提升飽足感。",
                "避免額外澱粉份量過大，維持血糖穩定。",
            ],
            diet_warnings=[],
            confidence_note="",
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
        ai_conclusion="尚未設定供應商，請先配置 VISION_PROVIDER 與 API Key。",
        next_meal_suggestion="尚未設定供應商，請先配置 VISION_PROVIDER 與 API Key。",
        next_meal_options=[],
        nutrition_tips=[],
        diet_warnings=[],
        confidence_note="",
    )


async def _analyze_with_gemini(image_base64: str) -> AnalyzeFoodResponse:
    """使用 Gemini Vision API 分析圖像"""
    import base64
    
    try:
        genai = _get_gemini_client()
        if not genai:
            raise Exception("缺少 GEMINI_API_KEY 或 google.generativeai 未安裝")

        # 使用 getattr 直接呼叫第三方 API，避免不必要的 cast
        model = getattr(genai, "GenerativeModel")('gemini-pro-vision')  # type: ignore[attr-defined]
        
        # 解碼 base64 圖像
        image_data = base64.b64decode(image_base64)
        
        # 構建提示
        prompt = (
            "請分析這張食物照片，並返回 JSON 格式的結果。"
            "禁止輸出 Markdown 或多餘文字。"
            "JSON 應包含以下欄位："
            "{"
            '"food_items": ["食物1", "食物2"], '
            '"estimated_calories_kcal": 數字, '
            '"macros": {"protein_g": 數字, "carbs_g": 數字, "fat_g": 數字}, '
            '"rule_check": {"high_protein": 布爾值, "zero_starch": 布爾值, "zero_alcohol": 布爾值, "mild_not_spicy": 布爾值}, '
            '"ai_conclusion": "一句話總結", '
            '"next_meal_suggestion": "建議文字", '
            '"next_meal_options": ["建議1", "建議2", "建議3"], '
            '"nutrition_tips": ["提示1", "提示2"], '
            '"diet_warnings": ["注意事項"], '
            '"confidence_note": "可信度提示"'
            "}"
        )
        
        # 調用 API
        response = getattr(model, "generate_content")([
            {"mime_type": "image/jpeg", "data": image_data},
            prompt
        ])
        
        # 解析響應
        text = response.text
        data = _extract_json(text)

        macros = data.get("macros", {})
        rule_check = data.get("rule_check", {})
        
        return AnalyzeFoodResponse(
            food_items=data.get("food_items", []),
            estimated_calories_kcal=float(data.get("estimated_calories_kcal", 0)),
            macros=MacroNutrients(
                protein_g=float(macros.get("protein_g", data.get("protein_g", 0))),
                carbs_g=float(macros.get("carbs_g", data.get("carbs_g", 0))),
                fat_g=float(macros.get("fat_g", data.get("fat_g", 0)))
            ),
            rule_check=DietaryRuleCheck(
                high_protein=bool(rule_check.get("high_protein", data.get("high_protein", False))),
                zero_starch=bool(rule_check.get("zero_starch", data.get("zero_starch", False))),
                zero_alcohol=bool(rule_check.get("zero_alcohol", data.get("zero_alcohol", True))),
                mild_not_spicy=bool(rule_check.get("mild_not_spicy", data.get("mild_not_spicy", True)))
            ),
            ai_conclusion=data.get("ai_conclusion", data.get("next_meal_suggestion", "")),
            next_meal_suggestion=data.get("next_meal_suggestion", ""),
            next_meal_options=_ensure_list(data.get("next_meal_options", [])),
            nutrition_tips=_ensure_list(data.get("nutrition_tips", [])),
            diet_warnings=_ensure_list(data.get("diet_warnings", [])),
            confidence_note=str(data.get("confidence_note", "")),
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
    confidence_note: str = ""
    try:
        confidence_note = _confidence_note_from_meta(req)

        # 若食物列表為空，使用 mock 數據
        if not req.food_items or len(req.food_items) == 0:
            print("[WARN] 食物列表為空，使用 Mock 數據作為回退")
            return _create_analysis_response(["chicken breast", "broccoli"], confidence_note)
        
        provider = os.getenv("AI_PROVIDER", os.getenv("VISION_PROVIDER", "mock")).lower()
        print(f"[INFO] AI_PROVIDER: {provider}")

        # 構建食物描述字符串
        food_str = ", ".join(req.food_items)
        detector_info = f"detector_build={req.detector_build or 'unknown'}"
        meta_info = ""
        if req.detection_meta:
            meta_info = f"detection_count={req.detection_meta.detection_count}, avg_confidence={req.detection_meta.average_confidence}"
        full_prompt = (
            f"檢測到的食物: {food_str}\n"
            f"描述: {req.description}\n"
            f"檢測資訊: {detector_info} {meta_info}".strip()
        )

        if provider == "gemini":
            try:
                return await _analyze_text_with_gemini(
                    req.food_items,
                    full_prompt,
                    req.locale,
                    confidence_note,
                )
            except Exception as gemini_error:
                print(f"[WARN] Gemini 分析失敗: {gemini_error}，回退到 Mock")
                return _create_analysis_response(req.food_items, confidence_note)

        if provider == "mock":
            # Mock 分析結果
            return _create_analysis_response(req.food_items, confidence_note)

        # 預設回退到 mock
        print(f"[WARN] 未知的 provider: {provider}，回退到 Mock")
        return _create_analysis_response(req.food_items, confidence_note)
    
    except Exception as e:
        print(f"[ERROR] analyze_text_with_ai 發生錯誤: {e}")
        print(f"[ERROR] 錯誤類型: {type(e)}")
        import traceback
        traceback.print_exc()
        # 最後的回退
        return _create_analysis_response(["chicken breast", "broccoli"], confidence_note)


async def _analyze_text_with_gemini(
    food_items: List[str],
    description: str,
    locale: str,
    confidence_note: str,
) -> AnalyzeFoodResponse:
    """使用 Gemini 進行文字分析"""
    try:
        genai = _get_gemini_client()
        if not genai:
            raise Exception("缺少 GEMINI_API_KEY 或 google.generativeai 未安裝")

        model = getattr(genai, "GenerativeModel")('gemini-pro')  # type: ignore[attr-defined]
        
        prompt = (
            f"{YOLO_TEXT_SYSTEM_PROMPT}\n\n"
            f"locale: {locale}\n"
            f"檢測到的食物清單: {', '.join(food_items)}\n"
            f"描述: {description}\n"
            f"可信度提示: {confidence_note or '無'}\n\n"
            "請返回 JSON 格式的分析結果，並保持欄位完整。"
        )
        
        print(f"[INFO] 發送到 Gemini: {prompt[:100]}...")
        response = getattr(model, "generate_content")(prompt)
        text = getattr(response, "text", str(response))
        print(f"[INFO] Gemini 響應: {text[:100]}...")

        data = _extract_json(text)
        macros = data.get("macros", {})
        rule_check = data.get("rule_check", {})
        
        return AnalyzeFoodResponse(
            food_items=data.get("food_items", food_items),
            estimated_calories_kcal=float(data.get("estimated_calories_kcal", 0)),
            macros=MacroNutrients(
                protein_g=float(macros.get("protein_g", data.get("protein_g", 0))),
                carbs_g=float(macros.get("carbs_g", data.get("carbs_g", 0))),
                fat_g=float(macros.get("fat_g", data.get("fat_g", 0)))
            ),
            rule_check=DietaryRuleCheck(
                high_protein=bool(rule_check.get("high_protein", data.get("high_protein", False))),
                zero_starch=bool(rule_check.get("zero_starch", data.get("zero_starch", False))),
                zero_alcohol=bool(rule_check.get("zero_alcohol", data.get("zero_alcohol", True))),
                mild_not_spicy=bool(rule_check.get("mild_not_spicy", data.get("mild_not_spicy", True)))
            ),
            ai_conclusion=data.get("ai_conclusion", data.get("next_meal_suggestion", "")),
            next_meal_suggestion=data.get("next_meal_suggestion", ""),
            next_meal_options=_ensure_list(data.get("next_meal_options", [])),
            nutrition_tips=_ensure_list(data.get("nutrition_tips", [])),
            diet_warnings=_ensure_list(data.get("diet_warnings", [])),
            confidence_note=str(data.get("confidence_note", confidence_note or "")),
        )
    
    except Exception as e:
        print(f"[ERROR] Gemini 文字分析失敗: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise


def _create_analysis_response(food_items: List[str], confidence_note: str = "") -> AnalyzeFoodResponse:
    """根據食物清單生成分析結果"""
    
    # 簡單的營養數據庫（用於 demo）
    nutrition_db: Dict[str, Dict[str, float]] = {
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

    suggestions: List[str] = _build_suggestions(rule_check, total_protein, total_carbs)
    next_meal_options: List[str] = _build_next_meal_options(rule_check)
    nutrition_tips: List[str] = _build_nutrition_tips(total_protein, total_carbs, total_fat)
    diet_warnings: List[str] = _build_diet_warnings(rule_check, total_carbs)

    return AnalyzeFoodResponse(
        food_items=food_items,
        estimated_calories_kcal=total_cal if total_cal > 0 else 300,
        macros=MacroNutrients(
            protein_g=total_protein if total_protein > 0 else 25,
            carbs_g=total_carbs,
            fat_g=total_fat if total_fat > 0 else 10
        ),
        rule_check=rule_check,
        ai_conclusion=_build_ai_conclusion(food_items, rule_check, "Mock"),
        next_meal_suggestion=suggestions[0],
        next_meal_options=next_meal_options,
        nutrition_tips=nutrition_tips,
        diet_warnings=diet_warnings,
        confidence_note=confidence_note,
    )


def _build_suggestions(rule_check: DietaryRuleCheck, protein: float, carbs: float) -> List[str]:
    """根據飲食規則生成建議"""
    suggestions: List[str] = []

    if not rule_check.high_protein:
        suggestions.append("增加蛋白質攝取，建議補充雞蛋、肉類或豆類。")

    if not rule_check.zero_starch:
        suggestions.append("降低碳水化合物攝取，減少米飯、麵包等澱粉類食物。")

    if not rule_check.mild_not_spicy:
        suggestions.append("下一餐選擇清淡食物，避免過辣刺激。")

    if not suggestions:
        suggestions.append("很好！這餐符合所有飲食目標，請繼續保持。")

    return suggestions


def _build_next_meal_options(rule_check: DietaryRuleCheck) -> List[str]:
    options: List[str] = []
    if not rule_check.high_protein:
        options.append("雞胸 + 燙青菜 + 海帶芽")
        options.append("豆腐 + 菇類 + 味噌湯")
    if not rule_check.zero_starch:
        options.append("鮭魚 + 花椰菜 + 沙拉")
    if not rule_check.mild_not_spicy:
        options.append("清蒸魚 + 時蔬 + 湯品")

    while len(options) < 3:
        options.append("雞蛋 + 蔬菜 + 無糖豆漿")

    return options[:3]


def _build_nutrition_tips(protein: float, carbs: float, fat: float) -> List[str]:
    tips: List[str] = []
    if protein < 25:
        tips.append("蛋白質偏低，可增加雞蛋、魚肉或豆製品。")
    if carbs > 40:
        tips.append("碳水偏高，建議搭配高纖蔬菜降低負擔。")
    if fat > 20:
        tips.append("脂肪偏高，盡量避免油炸與濃醬。")
    if not tips:
        tips.append("營養分配均衡，維持現有比例即可。")
    return tips


def _build_diet_warnings(rule_check: DietaryRuleCheck, carbs: float) -> List[str]:
    warnings: List[str] = []
    if not rule_check.zero_starch or carbs > 40:
        warnings.append("澱粉比例偏高，注意份量控制。")
    if not rule_check.mild_not_spicy:
        warnings.append("口味可能偏刺激，腸胃敏感者需留意。")
    return warnings
