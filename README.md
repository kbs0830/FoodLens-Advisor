# FoodLens Advisor

> AI 驅動的食物辨識與飲食分析系統 — 上傳一張照片，立即獲得熱量估算、三大營養素分析與個人化飲食建議。

---

## 專案介紹

FoodLens Advisor 是一套「**瀏覽器端辨識 + 雲端 AI 分析**」的輕量飲食助手，採用 **Thin Client + Cloud Brain** 混合架構：

1. **前端 YOLO 辨識**：圖片在瀏覽器本地執行 ONNX Runtime，偵測食物種類（中亞料理 46 類）
2. **COCO-SSD 備援**：若 ONNX 偵測結果為零，自動切換 TensorFlow.js COCO-SSD（漢堡、披薩、香蕉等通用食物）
3. **Gemini AI 分析**：偵測到的食物標籤（純文字）送到 FastAPI 後端，呼叫 Google Gemini 2.5 Flash Lite 做深度分析
4. **即時回傳**：熱量（kcal）、蛋白質/碳水/脂肪（g）、飲食規則評估、下一餐建議、營養提示、飲食警告

### 核心設計亮點

| 亮點 | 說明 |
|------|------|
| **圖片不離裝置** | YOLO 推理在瀏覽器完成，使用者圖片不上傳雲端 |
| **Token 成本降低 5000×** | 傳送文字標籤（~10–30 token）而非圖片 base64（~數千 token）|
| **多層備援鏈** | ONNX → COCO-SSD → Gemini，任一層失敗系統仍可繼續 |
| **零 mock 資料** | 移除所有假資料，錯誤直接顯示真實原因 |
| **無框架前端** | 純 HTML5/CSS3/Vanilla JS，無需 Node.js 或打包工具 |

---

## 使用技術

| 層次 | 技術 | 版本 / 說明 |
|------|------|-------------|
| **前端** | HTML5 + CSS3 + Vanilla JavaScript | 無框架依賴 |
| **前端推理** | ONNX Runtime Web (WASM) | YOLOv8 ONNX 模型 |
| **前端備援** | TensorFlow.js + COCO-SSD | CDN 載入，80 類通用偵測 |
| **後端框架** | FastAPI | Python 3.13，`uvicorn` 伺服器 |
| **資料驗證** | Pydantic v2 | 型別安全的請求/回應模型 |
| **AI 分析** | Google Gemini 2.5 Flash Lite | `models/gemini-2.5-flash-lite` |
| **後端偵測** | Ultralytics YOLOv8 | `.pt` 格式，伺服器端推理 |
| **備用分類** | ResNet-50 Food-101 | HuggingFace `anonauthors/food101-resnet50` |
| **啟動腳本** | Windows Batch + PowerShell | 自動偵測 Python 路徑、清除 port |

---

## 系統架構

```
使用者上傳圖片
     │
     ▼
[瀏覽器] yolo-detector.js
  ├─ ONNX Runtime Web — YOLOv8 (46 類中亞食物)
  │    輸入: 640×640 letterbox, float32 ÷255
  │    輸出: [1, 50, 8400]（4 座標 + 46 類別分數）
  │    信心度門檻: 0.25
  └─ 備援: TensorFlow.js COCO-SSD（偵測結果為零時啟動）
  → 輸出 food_items[], confidence_scores[], description
     │
     ▼
[瀏覽器] script.js
  POST /api/v1/analyze-text
  {
    food_items: ["pilaf", "chicken"],
    description: "偵測到 2 項食物",
    locale: "zh-TW",
    detection_meta: { detection_count: 2, average_confidence: 0.72 }
  }
     │
     ▼
[FastAPI BFF :8080] vision_service.py
  analyze_text_with_ai()
  → 組裝繁中 system prompt
  → 呼叫 Google Gemini 2.5 Flash Lite
  → 解析 JSON 回應為 AnalyzeFoodResponse
     │
     ▼
[瀏覽器] displayResult()
  顯示: 熱量卡片、三大營養素環圖、飲食規則燈號、
        下一餐選項、營養提示、飲食警告
```

---

## AI 模型詳細說明

### 主要食物偵測模型 — milliy-taomlar-detector (YOLOv8 ONNX)

| 規格 | 數值 |
|------|------|
| 基底架構 | YOLOv8（Ultralytics） |
| 輸入尺寸 | 640 × 640 px（letterbox padding） |
| 輸出張量形狀 | `[1, 50, 8400]`（batch × (4+46 attrs) × anchors）|
| 類別數 | **46 類**（中亞料理） |
| 信心度門檻（前端） | 0.25 |
| 信心度門檻（後端） | 0.18 |
| 前端模型大小 | 43 MB（ONNX） |
| 後端模型大小 | 22 MB（PyTorch `.pt`） |
| 來源資料集 | Roboflow Universe — Milliy Taomlar Detector |

46 個支援類別：
```
kebab, layer cake, shashlik, samosa, greens, mashed potato, chicken, rice,
manti, onion, beef, tomato, peas, potato, soup, egg, pilaf, cucumber, sauce,
nori, lagman, pomegranate, blinchik, dolma, pepper, mashkichiri,
chickpea soup, stuffed vine leaves, cutlet, cheese, sausage, macaroni,
olivier salad, corn, caviar, salad, meatball, shashlik2, cabbage rolls,
pozharskiy cutlet, carrot, fried macaroni, jarkop stew, beans ...
```

**瀏覽器推理流程：**
```
圖片 → letterbox resize(640×640)
     → CHW float32 正規化（÷255）
     → ONNX Runtime Web (WASM 後端)
     → 輸出 [1, 50, 8400]
     → 解析各 anchor 最高分類別
     → 信心度 ≥ 0.25 篩選
     → NMS（IoU 閾值 0.45）
     → 輸出食物名稱與座標
```

### COCO-SSD 前端備援（TensorFlow.js）

當 ONNX 偵測結果為 0 時自動啟動，從 CDN 載入，零本地儲存需求。
- 執行框架：TensorFlow.js v4
- 信心度門檻：0.30
- 過濾保留食物相關類別：`banana, apple, sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, bowl`

### Gemini 2.5 Flash Lite（雲端 LLM 分析）

| 規格 | 說明 |
|------|------|
| 模型 ID | `models/gemini-2.5-flash-lite` |
| 輸入方式 | **純文字**（食物標籤，非圖片）|
| 輸出格式 | JSON（由 prompt engineering 約束）|
| 語言 | 繁體中文（`locale: zh-TW`）|
| 每次請求 token | ~50–150 token（vs. 圖片 ~5,000–10,000 token）|
| API 金鑰來源 | `bff-fastapi/.env`（不得提交版本控制）|

Gemini 回傳 10 個分析欄位：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `food_items` | `List[str]` | 確認後的食物清單 |
| `estimated_calories_kcal` | `float` | 預估熱量（kcal）|
| `macros.protein_g` | `float` | 蛋白質（g）|
| `macros.carbs_g` | `float` | 碳水化合物（g）|
| `macros.fat_g` | `float` | 脂肪（g）|
| `rule_check` | `DietaryRuleCheck` | 高蛋白 / 零澱粉 / 零酒精 / 清淡不辣 |
| `ai_conclusion` | `str` | 2–3 句整體評語 |
| `next_meal_suggestion` | `str` | 下一餐整體建議 |
| `next_meal_options` | `List[str]` | 3 個具體餐點選項 |
| `nutrition_tips` | `List[str]` | 2–3 條實用營養提示 |
| `diet_warnings` | `List[str]` | 飲食警告（高油、高糖、過敏原）|
| `confidence_note` | `str` | 偵測可信度說明 |

---

## API 端點

### `POST /api/v1/analyze-text`（主要端點）

**請求 Body（AnalyzeTextRequest）：**
```json
{
  "food_items": ["pilaf", "chicken", "salad"],
  "description": "前端 YOLO 偵測到 3 項食物",
  "locale": "zh-TW",
  "detector_build": "onnx-v1",
  "detection_meta": {
    "detection_count": 3,
    "average_confidence": 0.68
  }
}
```

**回應 Body（AnalyzeFoodResponse）：**
```json
{
  "food_items": ["手抓飯", "雞肉", "沙拉"],
  "estimated_calories_kcal": 620.0,
  "macros": {
    "protein_g": 38.5,
    "carbs_g": 72.0,
    "fat_g": 18.2
  },
  "rule_check": {
    "high_protein": true,
    "zero_starch": false,
    "zero_alcohol": true,
    "mild_not_spicy": true
  },
  "ai_conclusion": "此餐蛋白質充足，搭配均衡，適合午餐。",
  "next_meal_suggestion": "建議下一餐補充蔬菜纖維...",
  "next_meal_options": ["番茄蛋花湯 + 蒸魚", "涼拌黃瓜 + 豆腐", "燙青菜 + 水煮蛋"],
  "nutrition_tips": ["可增加深色蔬菜攝取", "注意飯量控制在 1 碗以內"],
  "diet_warnings": [],
  "confidence_note": "平均信心度 68%，結果僅供參考"
}
```

### 其他端點

| 方法 | 路徑 | 說明 | 輸入 |
|------|------|------|------|
| `GET` | `/health` | 健康檢查 | — |
| `POST` | `/api/v1/analyze-text` | **主流程**：YOLO 標籤 → Gemini 分析 | `AnalyzeTextRequest` |
| `POST` | `/api/v1/detect-food` | 後端 YOLO 偵測 | `image_base64` |
| `POST` | `/api/v1/analyze-food` | Gemini Vision 圖片分析（相容舊版） | `image_base64` |
| `POST` | `/api/v1/classify-food` | ResNet50 Food-101 分類（備用，回傳 Top-5）| `image_base64` |

---

## 快速開始

### 前置需求

- Python 3.13（`Programs\Python313\python.exe`）
- Gemini API Key（[Google AI Studio](https://aistudio.google.com/) 免費申請）

### Windows 一鍵啟動（推薦）

```bat
start-all.bat
```

腳本自動執行：
1. 偵測 `Programs\Python313\python.exe`（跳過 Windows Store stub）
2. 清除 port 8080 與 8000 上的既有程序
3. 啟動 BFF FastAPI（port 8080）
4. 啟動前端靜態伺服器（port 8000）
5. 開啟預設瀏覽器至 `http://127.0.0.1:8000`

### 手動啟動

```bash
# 1. 安裝後端依賴
cd bff-fastapi
pip install -r requirements.txt

# 2. 設定環境變數
copy .env.example .env
# 編輯 .env，填入 GEMINI_API_KEY

# 3. 啟動後端（port 8080）
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080

# 4. 另開終端啟動前端（port 8000）
cd web-client
python -m http.server 8000 --bind 127.0.0.1

# 5. 瀏覽器開啟
# http://127.0.0.1:8000
```

---

## 環境設定

在 `bff-fastapi/` 建立 `.env`（參考 `.env.example`）：

```env
# AI 分析供應商（固定 gemini，不要改為 mock）
VISION_PROVIDER=gemini

# Google Gemini API 金鑰（Google AI Studio 申請）
GEMINI_API_KEY=你的_API_金鑰

# 使用的模型 ID
GEMINI_TEXT_MODEL=models/gemini-2.5-flash-lite
GEMINI_VISION_MODEL=models/gemini-2.5-flash-lite

# 後端 YOLO 模型路徑（相對於 bff-fastapi/）
YOLO_WEIGHTS_PATH=weights/milliy-taomlar-detector-best.pt

# 後端偵測信心度門檻（前端為 0.25）
YOLO_CONF_THRESHOLD=0.18

# ResNet50 備用分類模型（HuggingFace Hub）
FOOD_MODEL_REPO=anonauthors/food101-resnet50

# CORS 允許來源（開發環境）
ALLOWED_ORIGINS=http://127.0.0.1:8000,http://localhost:8000
```

> `.env` 已加入 `.gitignore`，請勿將金鑰提交版本控制。

---

## 專案結構

```
FoodLens-Advisor/
│
├── bff-fastapi/                    # FastAPI 後端（Python 3.13）
│   ├── app/
│   │   ├── main.py                 # 路由定義（5 個端點）
│   │   ├── schemas.py              # Pydantic 請求/回應模型
│   │   └── services/
│   │       ├── vision_service.py   # Gemini AI 分析核心
│   │       ├── detection_service.py# 後端 YOLO 偵測（ultralytics）
│   │       └── food_classifier.py  # ResNet50 Food-101 分類
│   ├── weights/
│   │   ├── milliy-taomlar-detector-best.pt    # YOLOv8 權重（22 MB）
│   │   └── milliy-taomlar-detector-best.onnx  # ONNX 格式（43 MB）
│   ├── yolov8n.pt                  # YOLOv8n COCO 備援（6 MB）
│   ├── .env                        # API 金鑰（不提交 git）
│   ├── .env.example                # 環境變數範本
│   └── requirements.txt
│
├── web-client/                     # 前端（純 HTML/CSS/JS）
│   ├── index.html                  # 頁面入口
│   ├── style.css                   # 現代化 UI 樣式
│   ├── script.js                   # UI 主邏輯、BFF API 串接
│   ├── yolo-detector.js            # ONNX Runtime Web 推理
│   └── models/food/
│       └── milliy-taomlar-detector-best.onnx  # 前端推理用（43 MB）
│
├── docs/
│   ├── PROJECT_REPORT.md           # 期末專題報告（完整版）
│   └── MODELS.md                   # 各模型技術規格說明
│
├── logs/                           # 執行日誌（啟動時自動產生）
├── start-all.bat                   # Windows 一鍵啟動腳本
└── start-bff.ps1                   # 單獨啟動 BFF 的 PowerShell 腳本
```

---

## Pydantic 資料模型

```python
# 主要請求（前端送往後端）
class AnalyzeTextRequest(BaseModel):
    food_items: List[str]          # YOLO 偵測到的食物清單
    description: str               # 偵測摘要描述
    locale: str = "zh-TW"
    detector_build: Optional[str]  # 前端偵測器版本
    detection_meta: Optional[DetectionMeta]  # 偵測統計

# 主要回應（後端回傳前端）
class AnalyzeFoodResponse(BaseModel):
    food_items: List[str]
    estimated_calories_kcal: float
    macros: MacroNutrients         # protein_g / carbs_g / fat_g
    rule_check: DietaryRuleCheck   # high_protein / zero_starch / zero_alcohol / mild_not_spicy
    ai_conclusion: str
    next_meal_suggestion: str
    next_meal_options: List[str]
    nutrition_tips: List[str]
    diet_warnings: List[str]
    confidence_note: str
```

---

## 模型備援鏈

```
前端偵測:
  ONNX YOLOv8（46 類中亞食物，信心度 ≥ 0.25）
    └─ 偵測結果為零 → COCO-SSD TF.js（80 類通用，信心度 ≥ 0.30）

後端偵測（/api/v1/detect-food）:
  YOLOv8 PT（46 類，信心度 ≥ 0.18）
    └─ 失敗 → YOLOv8n COCO（80 類通用）

AI 分析:
  Gemini 2.5 Flash Lite
    └─ 失敗 → 回傳真實錯誤訊息（不使用 mock 資料）

備用分類（/api/v1/classify-food）:
  ResNet50 Food-101（101 類，Top-5 回傳）
    └─ 失敗 → ImageNet 預訓練 ResNet50
```

---

## 設計決策說明

### 為何選擇文字而非圖片呼叫 Gemini？

| 方案 | Token 消耗 | 隱私 | 延遲 |
|------|-----------|------|------|
| 直接傳圖片（base64）| ~5,000–10,000 token | 圖片上傳雲端 | 高 |
| 傳 YOLO 文字標籤 | ~10–30 token | 圖片留在本地 | 低 |

YOLO 已完成食物辨識，Gemini 只需做營養計算與建議，不需重新看圖，**成本降低約 300–1000 倍**。

### 為何前端使用 ONNX 而非直接呼叫 API？

- 圖片完全不離開使用者裝置（隱私保護）
- 無網路傳輸延遲（推理速度提升）
- 不消耗 API token（成本為零）
- ONNX Runtime Web 支援 WebAssembly 加速，跨平台相容

### 為何需要 COCO-SSD 備援？

ONNX 模型的訓練資料以中亞料理為主（手抓飯、烤肉串等），對漢堡、披薩等國際常見食物信心度偏低。COCO-SSD 補足這個偵測缺口，且從 CDN 載入無需佔用本地儲存空間。

---

## 注意事項

- **Python 路徑**：Windows 請使用 `Programs\Python313\python.exe`，非 Microsoft Store stub（`WindowsApps\python.exe`）
- **CORS**：後端目前設 `allow_origins=["*"]`，僅供開發環境使用，正式部署需限縮為實際網域
- **不要加回 mock 模式**：系統已完全移除假資料，Gemini 失敗時應顯示真實錯誤訊息
- **模型覆蓋範圍**：ONNX 模型為中亞料理（46 類），一般食物由 COCO-SSD 備援偵測
- **API 金鑰安全**：`.env` 已在 `.gitignore`，切勿寫入程式碼或提交版本控制

---

## 參考資料

- [FastAPI 官方文件](https://fastapi.tiangolo.com/)
- [Pydantic v2 文件](https://docs.pydantic.dev/)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html)
- [TensorFlow.js / COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)
- [Ultralytics YOLOv8](https://docs.ultralytics.com/)
- [Google Gemini API](https://ai.google.dev/)
- [Milliy Taomlar Dataset — Roboflow Universe](https://universe.roboflow.com/)
- [Food-101 Dataset — ETH Zurich](https://data.vision.ee.ethz.ch/cvl/datasets_extra/food-101/)
