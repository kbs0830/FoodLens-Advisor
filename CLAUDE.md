# FoodLens Advisor — CLAUDE.md

## 專案簡介

**FoodLens Advisor** 是一個 AI 飲食分析系統（Thin Client + Cloud Brain 架構）。
前端用 ONNX Runtime Web 在瀏覽器執行 YOLO 食物偵測，偵測結果（文字清單）送到 FastAPI 後端，由 Gemini AI 做營養分析並回傳結果。

---

## 必須讀取的檔案

修改任何功能前，先讀這些檔案：

| 檔案 | 說明 |
|------|------|
| `bff-fastapi/app/main.py` | FastAPI 路由定義，所有 API 端點入口 |
| `bff-fastapi/app/schemas.py` | 所有 Pydantic 請求/回應模型，改 API 前必看 |
| `bff-fastapi/app/services/vision_service.py` | Gemini AI 分析核心邏輯 |
| `bff-fastapi/app/services/detection_service.py` | 後端 YOLO 偵測（ultralytics） |
| `bff-fastapi/.env` | API 金鑰與 provider 設定（**不可提交 git**） |
| `web-client/script.js` | 前端主邏輯：上傳、BFF 串接、結果顯示 |
| `web-client/yolo-detector.js` | 瀏覽器端 ONNX 推理、前處理/後處理 |
| `start-all.bat` | Windows 一鍵啟動腳本（含 Python 路徑偵測） |

---

## 不需要讀取的檔案

以下檔案**不要讀取**，內容無意義或體積過大：

### 二進位 / 模型權重（大型）
- `bff-fastapi/weights/milliy-taomlar-detector-best.onnx` （43 MB）
- `bff-fastapi/weights/milliy-taomlar-detector-best.pt` （22 MB）
- `bff-fastapi/yolov8n.pt` （6 MB，通用備援模型）
- `bff-fastapi/self_generated_weights.pth` （0.8 MB）
- `web-client/models/food/milliy-taomlar-detector-best.onnx` （43 MB，同上的前端副本）

### 日誌（每次啟動都會覆寫）
- `logs/bff.log`
- `logs/web.log`
- `logs/bff_stop.log`
- `logs/web_stop.log`
- `logs/bff_test.log`
- `logs/bff2.log`

### 備份 / 重複文件（已合併）
- `docs/duplicates_backup/` — 整個目錄都是舊版備份
- `docs/ALL_MERGED_DOCS.md` — 合併快照，以原始檔為準

### 訓練腳本（不影響執行）
- `bff-fastapi/training/train.py`
- `bff-fastapi/training/eval.py`
- `bff-fastapi/training/data_template.yaml`

### 其他雜項
- `bff-fastapi/app/__pycache__/` — Python 快取
- `bff-fastapi/app/services/__pycache__/`
- `飲食分析助手.docx` — Word 文件
- `irs_177423227689f927a0ff9de0cdbde0561a123bb04a1fc5c6e3.pdf` — 外部 PDF

---

## 專案架構

```
FoodLens-Advisor/
│
├── bff-fastapi/                    # 後端（FastAPI, Python 3.13）
│   ├── app/
│   │   ├── main.py                 # 路由：/health, /api/v1/detect-food,
│   │   │                           #       /api/v1/analyze-food,
│   │   │                           #       /api/v1/analyze-text,
│   │   │                           #       /api/v1/classify-food
│   │   ├── schemas.py              # Pydantic 資料模型
│   │   └── services/
│   │       ├── vision_service.py   # Gemini AI 分析（文字輸入 → 營養回應）
│   │       ├── detection_service.py# YOLO 後端偵測（圖片輸入 → 食物清單）
│   │       └── food_classifier.py  # ResNet50 食物分類（備用）
│   ├── weights/
│   │   ├── milliy-taomlar-detector-best.pt   # 後端 YOLO 自訂模型（46 類中亞食物）
│   │   └── milliy-taomlar-detector-best.onnx # 同模型 ONNX 格式
│   ├── .env                        # 環境變數（不提交 git）
│   ├── .env.example                # 範本
│   └── requirements.txt
│
├── web-client/                     # 前端（純 HTML/CSS/JS）
│   ├── index.html                  # 頁面入口
│   ├── style.css                   # 樣式
│   ├── script.js                   # UI 主邏輯、BFF API 呼叫
│   ├── yolo-detector.js            # ONNX Runtime Web 推理（前端偵測）
│   └── models/food/
│       └── milliy-taomlar-detector-best.onnx  # 前端用 ONNX 模型（43 MB）
│
├── docs/                           # 文件
│   ├── PROJECT_REPORT.md           # 專題報告
│   └── duplicates_backup/          # 舊版備份（勿讀）
│
├── logs/                           # 執行日誌（啟動時自動產生）
├── .vscode/settings.json           # VS Code Python 解譯器設定
├── start-all.bat                   # Windows 一鍵啟動腳本
└── start-bff.ps1                   # 單獨啟動 BFF 的 PS1 腳本
```

---

## 資料流程

```
使用者上傳圖片
     │
     ▼
[瀏覽器] yolo-detector.js
  ONNX Runtime Web 推理
  → 輸出 food_items[], confidence_scores[]
     │
     ▼
[瀏覽器] script.js
  POST /api/v1/analyze-text
  { food_items, description, locale, detection_meta }
     │
     ▼
[後端] vision_service.py → analyze_text_with_ai()
  呼叫 Gemini AI（gemini-2.5-flash-lite）
  → 回傳 AnalyzeFoodResponse（營養、規則檢查、建議）
     │
     ▼
[瀏覽器] displayResult()
  顯示熱量、巨量營養素、飲食規則、AI 結語
```

---

## API 端點摘要

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/health` | 健康檢查 |
| POST | `/api/v1/analyze-text` | **主要端點** YOLO 結果 → Gemini 分析 |
| POST | `/api/v1/detect-food` | 後端 YOLO 偵測（圖片 base64 輸入） |
| POST | `/api/v1/analyze-food` | Gemini Vision 圖片分析（相容舊版） |
| POST | `/api/v1/classify-food` | ResNet50 食物分類（備用） |

---

## 環境變數（`bff-fastapi/.env`）

```env
VISION_PROVIDER=gemini          # 固定用 gemini，不要改成 mock
GEMINI_API_KEY=...              # Gemini API 金鑰
GEMINI_TEXT_MODEL=models/gemini-2.5-flash-lite
GEMINI_VISION_MODEL=models/gemini-2.5-flash-lite
YOLO_WEIGHTS_PATH=weights/milliy-taomlar-detector-best.pt
YOLO_CONF_THRESHOLD=0.18
FOOD_MODEL_REPO=anonauthors/food101-resnet50
ALLOWED_ORIGINS=http://127.0.0.1:8000,http://localhost:8000
```

> **重要**：系統已移除所有 mock 模式。若 Gemini 失敗，前端會顯示真實錯誤訊息，不會回傳假資料。

---

## 啟動方式

```bat
# Windows 一鍵啟動（推薦）
start-all.bat

# 手動分開啟動
cd bff-fastapi
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080

cd web-client
python -m http.server 8000 --bind 127.0.0.1
```

> **注意**：Windows 上 `where python` 會同時找到真實的 Python
> (`Programs\Python313\python.exe`) 和 Windows Store stub
> (`WindowsApps\python.exe`)。`start-all.bat` 已處理此問題，
> 會自動跳過 WindowsApps stub。

---

## YOLO 模型說明

| 模型 | 位置 | 用途 | 類別數 |
|------|------|------|--------|
| `milliy-taomlar-detector-best.onnx` | `web-client/models/food/` | **前端推理**（ONNX Runtime Web） | 46 |
| `milliy-taomlar-detector-best.pt` | `bff-fastapi/weights/` | 後端推理（ultralytics） | 46 |
| `yolov8n.pt` | `bff-fastapi/` | 備援通用模型（COCO 80 類） | 80 |

前端 ONNX 輸出格式：`[1, 50, 8400]`（4 座標 + 46 類別分數）  
信心度閾值：`0.25`（`yolo-detector.js` 中設定）

---

## 注意事項

- **不要加回 mock 模式**：系統已完全移除，Gemini 失敗應顯示錯誤
- **API 金鑰**：`.env` 已在 `.gitignore`，切勿寫入程式碼或提交
- **Python 路徑**：永遠用 `Programs\Python313\python.exe`，不是 WindowsApps stub
- **CORS**：後端已設 `allow_origins=["*"]`，開發環境用，上線需限縮
