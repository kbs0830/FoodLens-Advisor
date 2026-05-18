# 🌐 Web 開發分支指南

**分支名稱**: `web-dev`  
**建立日期**: 2026年5月18日  
**目的**: 純網站版本的 FoodLens Advisor 開發

---

## 📋 概述

本分支專注於**網頁前端開發**，使用 HTML5、CSS3 和 Vanilla JavaScript，配合現有的 FastAPI BFF 後端。相比 Android 版本，Web 版本具有更快的迭代速度和跨平台相容性。

---

## 🏗️ 項目結構

```
FoodLens-Advisor/
├── bff-fastapi/              # 後端服務（FastAPI）
│   ├── app/
│   │   ├── main.py          # 主應用程式
│   │   ├── schemas.py       # Pydantic 數據模型
│   │   └── services/        # 業務邏輯
│   ├── requirements.txt
│   └── .env                 # API 密鑰配置
│
├── web-client/              # 🌐 前端（本分支重點）
│   ├── index.html           # HTML 結構
│   ├── style.css            # 樣式和動畫
│   ├── script.js            # API 邏輯和 UI 交互
│   └── README.md            # 快速開始指南
│
└── android-client/          # Android 版（已棄用）
```

---

## 🚀 快速開始

### 1. 啟動後端 BFF

```bash
cd bff-fastapi
python app/main.py
```

✅ 預期輸出: `INFO:     Uvicorn running on http://0.0.0.0:8080`

### 2. 開啟 Web 客戶端

**方式 A: 直接打開（無伺服器）**
```bash
cd web-client
# Windows: 雙擊 index.html
# macOS/Linux: open index.html
```

**方式 B: 使用本地伺服器（推薦）**
```bash
cd web-client
python -m http.server 8000
# 然後訪問 http://127.0.0.1:8000
```

### 3. 測試連線

- 點擊「🧪 測試 BFF 連線」按鈕
- 應看到 ✅ 綠色成功提示
- 自動分析樣本食物（雞肉+西蘭花）

---

## 🎨 主要功能

| 功能 | 狀態 | 說明 |
|------|------|------|
| BFF 連線測試 | ✅ | `/health` 端點檢查 |
| 食物分析 | ✅ | `POST /api/v1/analyze-food` |
| 營養統計 | ✅ | 卡路里、蛋白質、碳水、脂肪 |
| 飲食規則檢查 | ✅ | 高蛋白、無澱粉、無酒精、溫和不辣 |
| AI 建議 | ✅ | 下一餐推薦 |
| 圖片上傳 | 🔄 | TODO: 實現相機/文件選擇 |
| 歷史記錄 | 🔄 | TODO: LocalStorage 儲存分析 |

---

## 🛠️ 開發工作流

### 本地開發

```bash
# 1. 建立功能分支
git checkout -b feature/xxx

# 2. 進行開發
# 編輯 web-client/index.html、style.css、script.js

# 3. 在本地伺服器測試
python -m http.server 8000

# 4. 提交更改
git add .
git commit -m "feat: add xxx"

# 5. 推送到 web-dev
git push origin web-dev

# 6. 創建 PR 合併到 main
```

### 樣式指南

- **顏色主題**: 紫色漸變 (#667eea → #764ba2)
- **響應式**: 最小寬度 320px，最大寬度 600px
- **動畫**: CSS transitions 和 keyframes
- **圖標**: 統一使用 Unicode 表情符號（🍽️ 🔥 💪 等）

---

## 📡 API 規範

### 健康檢查

```bash
GET http://127.0.0.1:8080/health
```

**響應:**
```json
{
  "status": "ok"
}
```

### 食物分析

```bash
POST http://127.0.0.1:8080/api/v1/analyze-food
```

**請求:**
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "locale": "zh-TW"
}
```

**響應:**
```json
{
  "food_items": ["雞肉", "西蘭花"],
  "estimated_calories_kcal": 312,
  "macros": {
    "protein_g": 48,
    "carbs_g": 12,
    "fat_g": 8
  },
  "rule_check": {
    "high_protein": true,
    "zero_starch": false,
    "zero_alcohol": true,
    "mild_not_spicy": true
  },
  "next_meal_suggestion": "建議配合綠茶，促進消化..."
}
```

---

## 🔌 環境變數

建立 `bff-fastapi/.env` 檔案:

```env
# 伺服器配置
HOST=0.0.0.0
PORT=8080
RELOAD=false

# 視覺 API 提供商 (選項: mock, openai, gemini)
VISION_PROVIDER=mock

# API 密鑰（如使用真實提供商）
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=AIzaSyxxx

# 速率限制
RATE_LIMIT_PER_MINUTE=30
```

---

## 🐛 常見問題

### Q: BFF 無法連接
**A:** 
- 確認 BFF 在 `http://127.0.0.1:8080` 上運行
- 檢查防火牆是否阻止 8080 端口
- 查看瀏覽器控制台的 CORS 錯誤

### Q: 分析結果總是相同
**A:** 當前使用模擬數據。請配置真實 Vision API：
```bash
export VISION_PROVIDER=openai
export OPENAI_API_KEY=sk-xxx
python app/main.py
```

### Q: 樣式未加載
**A:** 
- 使用本地伺服器（不要直接打開 HTML）
- 清除瀏覽器快取 (Ctrl+Shift+Delete)
- 檢查 DevTools 中是否有 404 錯誤

---

## 📚 下一步任務

### Phase 1: MVP 驗證 ✅
- [x] Web 客戶端基本框架
- [x] BFF 連線測試
- [x] 食物分析端點集成

### Phase 2: 功能完善 🔄
- [ ] 實現相機/文件選擇上傳
- [ ] 圖片預覽和編輯
- [ ] LocalStorage 分析歷史
- [ ] 離線模式支持

### Phase 3: 生產部署 ⏳
- [ ] PWA 配置（Service Worker）
- [ ] 生產環境 API 部署
- [ ] 性能優化（圖片壓縮、代碼分割）
- [ ] SEO 優化

---

## 📞 聯繫與支持

- **專案主頁**: [GitHub - FoodLens-Advisor](https://github.com/kbs0830/FoodLens-Advisor)
- **主分支**: `main` - 穩定版本
- **開發分支**: `web-dev` - 當前開發中
- **Android 分支**: `android-legacy` - 已棄用

---

**Happy Coding! 🚀**
