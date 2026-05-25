# 模型說明文件

本文件說明 FoodLens Advisor 所使用的各個 AI 模型，包含來源、技術規格、在系統中的角色，以及選用理由。

---

## 模型總覽

| 模型 | 用途 | 大小 |

| [milliy-taomlar-detector (ONNX)]| 主要食物偵測  | 43 MB |
| [YOLOv8n (COCO)]| 通用備援  | 6 MB |
| [COCO-SSD (TF.js)]| 通用備援 | CDN |
| [ResNet50 Food-101] | 食物分類（備用端點） | - |
| [Gemini 2.5 Flash Lite]| 營養分析 + 飲食建議| - |

---

## 1. milliy-taomlar-detector (ONNX)

**主要前端食物偵測模型**

### 來源
- 資料集：[Roboflow Universe — Milliy Taomlar Detector](https://universe.roboflow.com/)
- 基底架構：YOLOv8（Ultralytics）
- 訓練框架：PyTorch + Ultralytics YOLOv8
- 導出格式：ONNX（Open Neural Network Exchange）

### 技術規格

| 項目 | 數值 |
|------|------|
| 基底模型 | YOLOv8 |
| 輸入尺寸 | 640 × 640 px（letterbox padding） |
| 輸出張量 | `[1, 50, 8400]`（batch × attrs × anchors） |
| attrs 組成 | 4 座標（cx, cy, w, h）+ 46 類別分數 |
| 類別數 | **46 類**（中亞料理為主） |
| 信心度門檻 | 0.25 |
| 檔案大小 | 43 MB |

### 46 個類別

```
kebab, layer cake, shashlik, samosa, greens, mashed potato, chicken, rice,
unknown, manti, onion, beef, tomato, peas, potato, soup, egg, pilaf,
cucumber, sauce, nori, lagman, pomegranate, blinchik, dolma, pepper,
mashkichiri, chickpea soup, stuffed vine leaves, dolma2, cutlet, cheese,
sausage, macaroni, olivier salad, corn, caviar, salad, meatball, shashlik2,
cabbage rolls, pozharskiy cutlet, carrot, fried macaroni, jarkop stew, beans
```

### 推理流程（瀏覽器端）

```
圖片 → letterbox resize(640×640) → CHW float32 正規化(÷255)
     → ONNX Runtime Web (WASM) → [1, 50, 8400] 輸出
     → 解析各 anchor 的最高分類別 → 信心度過濾 → NMS → 結果
```

### 部署位置
```
web-client/models/food/milliy-taomlar-detector-best.onnx  # 前端
bff-fastapi/weights/milliy-taomlar-detector-best.onnx      # 後端備份
```

---

## 2. milliy-taomlar-detector (PT)

**後端 PyTorch 版本（同上模型，不同格式）**

### 來源
同 [#1](#1-milliy-taomlar-detector-onnx)，為 ONNX 版本的原始 PyTorch 權重。

### 技術規格

| 項目 | 數值 |
|------|------|
| 格式 | PyTorch `.pt`（ultralytics 格式） |
| 執行框架 | [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics) |
| 類別數 | 46 類（同 ONNX 版） |
| 信心度門檻 | 0.18（較前端寬鬆） |
| 檔案大小 | 22 MB |

### 部署位置
```
bff-fastapi/weights/milliy-taomlar-detector-best.pt
```

### 對應 API 端點
```
POST /api/v1/detect-food
```

---

## 3. YOLOv8n (COCO) 通用備援

**後端通用物件偵測備援模型**

### 來源
- 官方來源：[Ultralytics YOLOv8n](https://github.com/ultralytics/ultralytics)
- 預訓練資料集：[COCO 2017](https://cocodataset.org/)（Common Objects in Context）
- 模型 ID：`yolov8n.pt`（YOLOv8 Nano）

### 技術規格

| 項目 | 數值 |
|------|------|
| 架構 | YOLOv8 Nano（最小版本） |
| 參數量 | 約 3.2M |
| 檔案大小 | 6 MB |

### 食物相關 COCO 類別
```
banana, apple, sandwich, orange, broccoli, carrot, hot dog,
pizza, donut, cake（共 10 類）
```

### 部署位置
```
bff-fastapi/yolov8n.pt
```

---

*** COCO-SSD 前端備援 ***

**瀏覽器端通用偵測備援模型**

### 來源
- 官方來源：[TensorFlow.js Models — COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)
- 載入方式：CDN（無需本地檔案）
- 預訓練資料集：COCO 2017

### 技術規格

| 項目 | 數值 |
|------|------|
| 執行框架 | TensorFlow.js v4 |
| 信心度門檻 | 0.30 |

### 啟動方式
```html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2"></script>
```

### 在系統中的角色
ONNX 模型的備援：當 ONNX 模型對圖片中的食物信心度不足（0 個偵測結果）時，自動切換 COCO-SSD 進行二次偵測。

```
ONNX 偵測 → 0 結果 → 自動啟動 COCO-SSD → 過濾食物類別 → 送 Gemini 分析
```

本系統中 COCO-SSD 只保留食物相關類別：
```
banana, apple, sandwich（漢堡/三明治）, orange, broccoli, carrot,
hot dog, pizza, donut, cake, bowl, cup, wine glass, bottle
```

---

## 5. ResNet50 Food-101

**伺服器端食物分類模型（備用端點）**

### 來源
- HuggingFace 模型庫：[`anonauthors/food101-resnet50`](https://huggingface.co/anonauthors/food101-resnet50)
- 訓練資料集：[Food-101](https://data.vision.ee.ethz.ch/cvl/datasets_extra/food-101/)
  - ETH Zurich 發布，101 種食物各 1000 張圖片，共 101,000 張

### 技術規格

| 項目 | 數值 |
|------|------|
| 架構 | ResNet-50（殘差神經網路） |
| 輸入尺寸 | 224 × 224 px |
| 類別數 | **101 類**（國際通用食物） |
| 執行框架 | PyTorch + torchvision |
| 下載方式 | `huggingface_hub.hf_hub_download` |

### 101 個類別（部分）
```
apple_pie, baby_back_ribs, baklava, beef_carpaccio, beef_tartare,
bibimbap, bread_pudding, breakfast_burrito, bruschetta, caesar_salad,
cheesecake, chicken_curry, chicken_wings, chocolate_cake, club_sandwich,
donuts, dumplings, edamame, eggs_benedict, fish_and_chips,
french_fries, fried_rice, frozen_yogurt, garlic_bread, gyoza,
hamburger, hot_dog, ice_cream, lasagna, macaroni_and_cheese,
nachos, onion_rings, oysters, pad_thai, pancakes, pizza, ramen,
sashimi, spring_rolls, steak, sushi, tacos, waffles...（共 101 類）
```

### 對應 API 端點
```
POST /api/v1/classify-food
```

### 備注
此端點為分類模型（非偵測），回傳 Top-5 可能食物與信心度，適合單一食物圖片的精確分類。目前為備用端點，主流程不使用。

---

### Google Gemini 2.5 Flash Lite

**核心 AI 分析模型（雲端 LLM）**

### 來源
- 提供商：[Google DeepMind / Google AI Studio](https://ai.google.dev/)
- 模型 ID：`models/gemini-2.5-flash-lite`
- API：Google Generative AI Python SDK（`google-generativeai`）

### 技術規格

| 項目 | 說明 |
|------|------|
| 模型家族 | Gemini 2.5（Google 最新多模態系列） |
| 版本 | Flash Lite（輕量、低延遲、低成本）|
| 輸入類型 | 文字（本系統主要使用）、圖片（相容舊版端點）|
| 輸出格式 | JSON（透過 prompt engineering 約束）|
| 語言支援 | 繁體中文（`locale: zh-TW`）|

### 在系統中的角色

本系統以「**文字驅動**」方式呼叫 Gemini，不上傳圖片，大幅降低 token 用量：

```
前端偵測食物標籤（文字）→ POST /api/v1/analyze-text
→ vision_service.py 組裝 prompt → Gemini API → JSON 回應
→ 解析為 AnalyzeFoodResponse → 前端顯示
```

### Prompt 設計

系統 prompt 要求 Gemini 扮演「專業營養分析師與飲食顧問」，輸出包含：

| 欄位 | 說明 |
|------|------|
| `food_items` | 分析後確認的食物清單 |
| `estimated_calories_kcal` | 預估熱量（kcal）|
| `macros` | 蛋白質、碳水、脂肪（g）|
| `rule_check` | 高蛋白 / 低澱粉 / 零酒精 / 清淡不辣 四項評估 |
| `ai_conclusion` | 2-3 句整體評語 |
| `next_meal_suggestion` | 下一餐建議說明 |
| `next_meal_options` | 3 個具體餐點選項（主菜＋配菜）|
| `nutrition_tips` | 2-3 條實用營養提示 |
| `diet_warnings` | 飲食警告（高油、高糖、過敏原等）|
| `confidence_note` | 偵測可信度提示 |

### 費用說明
- 使用 Google AI Studio API Key（開發用途免費配額）
- API Key 儲存於 `bff-fastapi/.env`，**不得提交版本控制**

---

## 模型選用決策說明

### 為何前端偵測用 ONNX？
- **隱私**：圖片不離開使用者裝置
- **速度**：無網路傳輸延遲
- **成本**：不消耗 API token（圖片 base64 約 500KB，文字標籤僅 100 bytes）

### 為何需要 COCO-SSD 備援？
- ONNX 模型訓練資料以中亞料理為主，對漢堡、披薩等國際食物信心度低
- COCO-SSD 為通用模型，補足常見食物的偵測缺口

### 為何 Gemini 使用文字而非圖片輸入？
- 圖片 base64 約消耗 **數千 token**，文字標籤僅 **10-30 token**
- YOLO 已完成食物辨識，Gemini 只需做營養計算與建議，不需重新看圖
- 大幅降低 API 成本與延遲

### 模型備援鏈

```
前端偵測:  ONNX (YOLOv8, 46類) → 失敗 → COCO-SSD (80類)
後端偵測:  YOLOv8 PT (46類)    → 失敗 → YOLOv8n COCO (80類)
AI 分析:   Gemini 2.5 Flash Lite → 失敗 → 回傳錯誤訊息（不使用 mock）
分類端點:  ResNet50 Food-101    → 失敗 → ImageNet 預訓練 ResNet50
```

---

## 相關檔案路徑

```
bff-fastapi/
├── weights/
│   ├── milliy-taomlar-detector-best.pt    # YOLOv8 PyTorch 權重
│   └── milliy-taomlar-detector-best.onnx  # ONNX 格式（後端備份）
├── yolov8n.pt                              # YOLOv8n COCO 通用備援
├── self_generated_weights.pth             # 自訓練實驗權重
└── app/
    ├── food101_labels.txt                  # ResNet50 Food-101 標籤檔
    └── services/
        ├── detection_service.py            # 使用 PT 模型的後端偵測邏輯
        ├── food_classifier.py              # ResNet50 分類邏輯
        └── vision_service.py               # Gemini AI 分析邏輯

web-client/
└── models/food/
    └── milliy-taomlar-detector-best.onnx  # ONNX 模型（前端推理用）
```
