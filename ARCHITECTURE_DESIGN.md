# 🏗️ FoodLens Advisor 架構設計 (YOLO + AI 方案)

**日期**: 2026年5月19日  
**目標**: 整合 YOLO 前端檢測 + AI 後端分析，降低 token 消耗

---

## 📊 當前狀態分析

### ✅ 已完成
| 功能 | 位置 | 狀態 |
|------|------|------|
| BFF 後端框架 | `bff-fastapi/` | ✅ 運作中 |
| 前端界面 | `web-client/` | ✅ 運作中 |
| 連線測試 | `/health` | ✅ 可用 |
| 食物分析 API | `/api/v1/analyze-food` | ✅ Mock 數據 |
| 營養統計展示 | UI 元件 | ✅ 可顯示 |
| 飲食規則檢查 | UI 邏輯 | ✅ 可檢查 |

### ⚠️ 待完成
| 功能 | 當前狀態 | 優先級 |
|------|---------|--------|
| 真實 AI 整合 | Mock 數據 | 🔴 高 |
| 前端 YOLO 檢測 | 未實現 | 🔴 高 |
| 圖片上傳 | 未實現 | 🟡 中 |
| 分析歷史記錄 | 未實現 | 🟡 中 |

---

## 🎯 新架構設計：YOLO 前端 + AI 後端

### 問題陳述
**原始流程的缺點：**
- 完整的 Base64 編碼圖像 (通常 10KB-100KB) → 發送給 AI
- AI 需要讀取圖像、提取文字、進行分析 → **消耗大量 token**

**優化方案：**
```
圖像 → YOLO 檢測 (前端) → 文字標籤 (~100字)
  ↓
文字 → AI 分析 (後端) → 飲食建議
```

### 優勢
- ✅ **降低 Token 消耗**: Base64 圖像 → 文字標籤 = 100-1000 倍的 token 縮減
- ✅ **加快響應速度**: 前端 GPU 加速 YOLO 檢測，無網絡延遲
- ✅ **離線可用**: YOLO 檢測在本地完成，無需API調用
- ✅ **隱私保護**: 圖像不上傳到伺服器，只上傳文字標籤

---

## 🔧 架構流程圖

```
┌─────────────────────────────────────────────────────────────────┐
│                         用戶界面 (Web)                          │
│  • 相機/文件上傳                                                 │
│  • 實時預覽                                                      │
│  • 結果展示                                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓ 圖像
┌─────────────────────────────────────────────────────────────────┐
│                    前端 YOLO 檢測 (TensorFlow.js)                │
│                                                                  │
│  輸入: 圖像                                                      │
│  • YOLO 模型 (YOLOv5n 輕量版)                                   │
│  • 食物檢測類別 (100+ 食物)                                     │
│  • 邊界框 + 信心度                                              │
│                                                                  │
│  輸出: 文字標籤 (JSON)                                          │
│  {                                                              │
│    "food_items": ["chicken", "broccoli", ...],                │
│    "confidence": [0.95, 0.92, ...],                           │
│    "description": "Grilled chicken breast with steamed..."    │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                    ↓ 文字 (~200 字符)
                    (HTTP POST)
┌─────────────────────────────────────────────────────────────────┐
│                      BFF 後端 (FastAPI)                         │
│                                                                  │
│  新端點: POST /api/v1/analyze-text                             │
│  輸入: {                                                         │
│    "food_items": ["chicken", "broccoli"],                      │
│    "description": "...",                                       │
│    "locale": "zh-TW"                                           │
│  }                                                              │
│                                                                  │
│  • 調用 OpenAI/Gemini 分析                                     │
│  • 計算營養值                                                   │
│  • 檢查飲食規則                                                │
│  • 生成建議                                                     │
│                                                                  │
│  輸出: AnalyzeFoodResponse {                                    │
│    "food_items": [...],                                        │
│    "estimated_calories_kcal": 312.0,                          │
│    "macros": {...},                                            │
│    "rule_check": {...},                                        │
│    "next_meal_suggestion": "..."                               │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓ JSON
┌─────────────────────────────────────────────────────────────────┐
│                      前端結果展示                                │
│  • 食物清單                                                      │
│  • 營養圖表                                                      │
│  • 飲食規則檢查 ✅/❌                                            │
│  • AI 建議                                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 實現步驟

### 第一階段：前端 YOLO 集成

**文件**: `web-client/yolo-detector.js`

```javascript
// 使用 TensorFlow.js + COCO-SSD 或 YOLOv5 Web
// 目標: 檢測圖像中的食物

async function detectFood(imageElement) {
  // 載入預訓練模型
  const model = await cocoSsd.load();
  
  // 執行檢測
  const predictions = await model.estimateObjects(imageElement);
  
  // 篩選食物類別
  const foodItems = predictions
    .filter(p => FOOD_CATEGORIES.includes(p.class))
    .map(p => ({
      item: p.class,
      confidence: p.score
    }));
  
  return {
    food_items: foodItems.map(f => f.item),
    confidence: foodItems.map(f => f.confidence),
    description: generateDescription(foodItems)
  };
}
```

### 第二階段：後端文字分析 API

**文件**: `bff-fastapi/app/main.py`

```python
@app.post("/api/v1/analyze-text")
async def analyze_text(req: AnalyzeTextRequest) -> AnalyzeFoodResponse:
    # 從 YOLO 輸出的文字調用 AI
    # 消耗的 token 量 ~ 500 (文字) vs 4000+ (圖像)
    
    ai_prompt = f"""
    用戶拍攝的食物：{req.food_items}
    描述：{req.description}
    
    請分析此餐點的：
    1. 營養成分估計
    2. 符合的飲食規則
    3. 下一餐建議
    """
    
    response = openai.ChatCompletion.create(
        model="gpt-4-vision",  # 或 gemini-2.0-flash
        messages=[{"role": "user", "content": ai_prompt}]
    )
    
    return parse_response(response)
```

### 第三階段：前端 UI 整合

**文件**: `web-client/script.js`

```javascript
async function uploadAndAnalyze(file) {
  // 1. 前端 YOLO 檢測
  const yoloResult = await detectFood(imageElement);
  
  // 2. 發送到後端分析
  const response = await fetch(`${BFF_URL}/api/v1/analyze-text`, {
    method: 'POST',
    body: JSON.stringify(yoloResult)  // 只發送文字！
  });
  
  // 3. 顯示結果
  displayResult(await response.json());
}
```

---

## 📦 技術選型

### 前端 YOLO 選項

| 選項 | 優點 | 缺點 | 推薦 |
|------|------|------|------|
| **COCO-SSD** | 輕量、快速 | 不是食物專用 | ✅ 快速原型 |
| **YOLOv5 Web** | 高精度、開源 | 文件較大 | ✅ 最佳平衡 |
| **TensorFlow.js** | 官方支援 | 學習曲線陡 | ⚠️ 進階用 |
| **MediaPipe** | Google 官方 | 食物檢測支援一般 | ⚠️ 限定用途 |

**推薦**: **YOLOv5n (nano)** + TensorFlow.js
- 模型大小: ~12MB (可接受)
- 推理速度: ~100ms (GPU) 或 500ms (CPU)
- 精度: 適合食物檢測

### 後端 AI 選項

| 選項 | Token 消耗 | 成本 | 推薦 |
|------|-----------|------|------|
| **GPT-4 Vision** | 4000+ (圖像) | $$ | ❌ 本方案不需要 |
| **GPT-4o** (文字) | 300-500 | $ | ✅ 最佳 |
| **Gemini Flash** | 400-600 | $ | ✅ 更便宜 |
| **Claude 3.5** | 500-700 | $$ | ✅ 高質量 |

**推薦**: **Gemini 2.0 Flash** 或 **GPT-4o mini**
- 成本: $0.15/百萬 tokens (Gemini) vs $0.15/百萬 (GPT-4o mini)
- 速度快，適合即時分析

---

## 🚀 部署檢查表

### 前端 (web-client/)
- [ ] 新增 `yolo-detector.js`
- [ ] 新增 `<script src="yolo-detector.js"></script>` 到 `index.html`
- [ ] 新增相機/文件上傳 UI
- [ ] 修改 `script.js` 以調用 YOLO → 後端分析

### 後端 (bff-fastapi/)
- [ ] 新增 `AnalyzeTextRequest` 到 `schemas.py`
- [ ] 新增 `POST /api/v1/analyze-text` 端點
- [ ] 整合 AI API (OpenAI/Gemini)
- [ ] 設定 `.env` 中的 API 密鑰
- [ ] 測試文字分析功能

### 資料庫 (新增)
- [ ] 設計 `analysis_history` 表
- [ ] 儲存用戶分析記錄
- [ ] 實現歷史查詢 API

---

## 📊 性能對比

### Token 消耗估計

```
【原始流程】
圖像 (1000x800) → Base64 編碼
  ↓
字符數: ~1,067,000 (Base64 膨脹)
Token (GPT): ~267,000 tokens !!!
成本 (GPT-4 Vision): $8.00+ 每次分析

【優化流程】
圖像 → YOLO 檢測 (本地)
  ↓
文字: "Grilled chicken (0.95), Steamed broccoli (0.92), ..."
字符數: ~150
Token (GPT): ~50 tokens
成本 (GPT-4o): $0.0008 每次分析

【節省比例】
Token: 267,000 / 50 = 5,340 倍 ✅
成本: $8.00 / $0.0008 = 10,000 倍 ✅
```

---

## 🔐 安全考慮

- ✅ **前端檢測**: YOLO 模型在瀏覽器本地執行，圖像不上傳
- ✅ **API 密鑰**: 只存放在後端 `.env`，前端無法存取
- ✅ **HTTPS**: 生產環境必須使用 HTTPS
- ✅ **速率限制**: 後端應設置每用戶/IP 的 API 調用限制

---

## 📅 開發時程

| 階段 | 任務 | 預計時間 |
|------|------|---------|
| 第1周 | 前端 YOLO 集成 + UI | 3-5 天 |
| 第2周 | 後端文字分析 API | 2-3 天 |
| 第3周 | 測試 + 優化 | 2-3 天 |
| 第4周 | 資料庫 + 歷史記錄 | 3-5 天 |

---

## 📚 參考資源

- [TensorFlow.js](https://www.tensorflow.org/js)
- [YOLOv5 Web](https://github.com/ultralytics/yolov5)
- [COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)
- [FastAPI 文檔](https://fastapi.tiangolo.com/)
- [OpenAI API](https://openai.com/api/)
- [Google Gemini API](https://ai.google.dev/)

---

## 🎓 課程應用

**本設計展示的技能：**
1. **AI/ML 集成**: YOLO 前端檢測 + LLM 後端分析
2. **Web 開發**: HTML/CSS/JS + REST API
3. **雲端計算**: FastAPI + 外部 API 調用
4. **優化設計**: Token 消耗優化、成本降低
5. **系統架構**: 前後端分離、模型部署

**期末專題亮點：**
- 🌟 創新的混合 AI 方案 (YOLO + LLM)
- 🌟 成本效益優化 (10,000倍成本降低)
- 🌟 實用的網站應用
- 🌟 完整的技術棧展示

