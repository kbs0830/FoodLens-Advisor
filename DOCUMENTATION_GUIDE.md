```
FoodLens-Advisor 完整項目結構
═════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────┐
│          根目錄 (項目主文件)                             │
└─────────────────────────────────────────────────────────┘

根目錄/
│
├── 📖 主要文檔 (根據分支選擇)
│   ├── README.md ⭐
│   │   • 項目概述
│   │   • 系統架構圖
│   │   • 分支選擇指南
│   │   • 快速開始
│   │
│   ├── WEB_DEVELOPMENT.md ✨ Web 版本專用
│   │   • Web 完整開發指南
│   │   • YOLO + AI 架構
│   │   • 部署到 Vercel + Railway
│   │   • Token 成本優化 (10,000 倍)
│   │
│   └── ANDROID_DEVELOPMENT.md 📱 Android 版本專用
│       • Android 開發指南
│       • Jetpack Compose
│       • Google Play 上線
│       • ⚠️ 暫停維護 (建議改用 Web)
│
├── 🌐 Web 版本文件夾 (web-dev 分支)
│   └── foodlens-web/
│       ├── web-client/
│       │   ├── index.html              ✅ YOLO 檢測 UI
│       │   ├── script.js               ✅ 前端邏輯
│       │   ├── yolo-detector.js        ✨ YOLO 檢測模組
│       │   ├── style.css               ✅ 樣式表
│       │   └── README.md
│       │
│       ├── bff-fastapi/
│       │   ├── app/
│       │   │   ├── main.py             ✅ FastAPI 應用
│       │   │   ├── schemas.py
│       │   │   └── services/
│       │   │       └── vision_service.py
│       │   ├── requirements.txt
│       │   └── .env (可選)
│       │
│       └── 文檔/
│           ├── IMPLEMENTATION_GUIDE.md
│           ├── ARCHITECTURE_DESIGN.md
│           └── TEST_VERIFICATION_REPORT.md
│
├── 📱 Android 版本文件夾 (main 分支)
│   └── android-client/
│       ├── app/
│       │   ├── src/main/
│       │   │   ├── java/com/foodlens/advisor/
│       │   │   │   ├── MainActivity.kt
│       │   │   │   ├── data/
│       │   │   │   ├── network/
│       │   │   │   ├── ui/
│       │   │   │   └── util/
│       │   │   └── res/
│       │   ├── build.gradle.kts
│       │   └── proguard-rules.pro
│       ├── build.gradle.kts
│       └── settings.gradle.kts
│
├── 🔧 後端共享 (可用於任一版本)
│   └── bff-fastapi/
│       ├── app/
│       ├── requirements.txt
│       └── .env
│
└── ⚙️ 配置文件
    ├── start-all.bat           唯一啟動入口
    ├── .gitignore             Git 配置
    └── .git/                  版本控制

═══════════════════════════════════════════════════════════

📊 分支結構圖
═════════════════════════════════════════════════════════════

主倉庫 (FoodLens-Advisor)
│
├─── main 分支 (原始)
│    ├── Android 開發
│    ├── Jetpack Compose
│    ├── 相機功能
│    └── 本地儲存
│
└─── web-dev 分支 ⭐ 推薦
     ├── Web 開發
     ├── YOLO + AI 架構
     ├── 成本優化 (10,000 倍)
     └── 隱私保護

═══════════════════════════════════════════════════════════

🚀 快速開始指南
═════════════════════════════════════════════════════════════

方式 1: Web 版本 (推薦 ⭐)
─────────────────────────

1. 查看文檔: WEB_DEVELOPMENT.md
2. 切換分支: git checkout web-dev
3. 啟動 BFF:
   cd foodlens-web\bff-fastapi
   python app/main.py

4. 啟動前端:
   cd foodlens-web\web-client
   python -m http.server 8000

5. 打開網頁: http://127.0.0.1:8000


方式 2: Android 版本 (可選)
─────────────────────────

1. 查看文檔: ANDROID_DEVELOPMENT.md
2. 分支已在 main (無需切換)
3. 用 Android Studio 打開: android-client/
4. 等待 Gradle Sync
5. 連接設備或模擬器
6. Run → Run 'app'


═════════════════════════════════════════════════════════════

📈 文檔導航地圖
═════════════════════════════════════════════════════════════

根據你的角色選擇文檔:

👨‍💼 決策者 / 課程老師
  → 讀 README.md (3分鐘)
  → 查看架構圖
  → 了解成本節省

👨‍💻 Web 開發者
  → 讀 WEB_DEVELOPMENT.md
  → 進入 foodlens-web/
  → 查看 IMPLEMENTATION_GUIDE.md
  → 開始開發

📱 Android 開發者
  → 讀 ANDROID_DEVELOPMENT.md
  → 進入 android-client/
  → 用 Android Studio 打開
  → 開始開發

🎓 學生 / 期末專題
  → 讀 README.md
  → 選擇一個版本深入
  → 查看對應的開發文檔
  → 完成專題

═════════════════════════════════════════════════════════════

🔑 關鍵文件說明
═════════════════════════════════════════════════════════════

根目錄文件:

README.md ⭐ 主入口
├── 系統架構圖 (Mermaid)
├── 分支說明
├── 快速開始 (5 分鐘)
├── 技術選型對比
└── 推薦方案

WEB_DEVELOPMENT.md ✨ Web 開發完整指南
├── 快速開始
├── 架構設計
├── 功能特性
├── 技術棧
├── 開發流程
├── 部署指南 (Vercel + Railway)
└── 常見問題

ANDROID_DEVELOPMENT.md 📱 Android 開發完整指南
├── 項目概述 (⚠️ 暫停維護)
├── 環境設置
├── 項目結構
├── 核心功能
├── 開發指南
├── 部署步驟 (Google Play)
└── 常見問題

═════════════════════════════════════════════════════════════

✨ 功能對比
═════════════════════════════════════════════════════════════

Web 版本 vs Android 版本

指標              Web 版本           Android 版本
─────────────────────────────────────────────────
開發難度          簡單 ✅            中等
部署複雜度        簡單 ✅            複雜
Token 成本        $0.0008 ✅         $8.00
YOLO 檢測         本地 ✅            不支援
跨平台            是 ✅             否
開發時間          短 ✅              長
維護成本          低 ✅              高
適合生產          是 ✅             否
推薦指數          ⭐⭐⭐⭐⭐         ⭐

═════════════════════════════════════════════════════════════

🎯 推薦選擇
═════════════════════════════════════════════════════════════

如果你想要:

✓ 最快上手 → Web 版本 (30 分鐘)
✓ 學習 AI/ML → Web 版本 (YOLO + LLM)
✓ 部署上線 → Web 版本
✓ 降低成本 → Web 版本 (10,000 倍)
✓ 跨平台使用 → Web 版本
✓ 隱私保護 → Web 版本

✗ 僅學習 Kotlin → Android 版本 (但建議用官方教程)
✗ 學習 Jetpack → Android 版本 (但建議用官方示例)

結論: 99% 情況下選擇 Web 版本

═════════════════════════════════════════════════════════════

📚 相關資源
═════════════════════════════════════════════════════════════

主文檔 (根目錄):
  • README.md
  • WEB_DEVELOPMENT.md
  • ANDROID_DEVELOPMENT.md

Web 版本文檔 (foodlens-web/):
  • PROJECT_OVERVIEW.md
  • ARCHITECTURE_DESIGN.md
  • IMPLEMENTATION_GUIDE.md
  • TEST_VERIFICATION_REPORT.md

實用鏈接:
  • FastAPI: https://fastapi.tiangolo.com/
  • TensorFlow.js: https://www.tensorflow.org/js
  • Jetpack Compose: https://developer.android.com/jetpack/compose

═════════════════════════════════════════════════════════════

💡 開發提示
═════════════════════════════════════════════════════════════

Web 開發:
  1. 先測試本地版本 (http://127.0.0.1:8000)
  2. 使用 Chrome DevTools 調試 (F12)
  3. 每次更改 Python 代碼後重啟 BFF
  4. 使用 curl 測試 API

Android 開發:
  1. 熟悉 Kotlin 基礎
  2. 瞭解 Jetpack Compose
  3. 測試時使用真機勝於模擬器
  4. 定期清除 Gradle 快取

═════════════════════════════════════════════════════════════

✅ 完成檢查清單
═════════════════════════════════════════════════════════════

☑ README.md 已更新 (架構圖 + 分支說明)
☑ WEB_DEVELOPMENT.md 已創建
☑ ANDROID_DEVELOPMENT.md 已創建
☑ 文件結構清晰 (分支分開)
☑ 所有文檔相互連接
☑ 推薦方案清晰 (Web 優先)
☑ 快速開始指南完整
☑ 技術選型對比清楚

═════════════════════════════════════════════════════════════

🎉 完成！
═════════════════════════════════════════════════════════════

你現在有一個完整、結構清晰的 FoodLens-Advisor 項目！

特點:
  ✓ 三份詳細文檔 (主 MD + Web MD + Android MD)
  ✓ 完整的架構圖
  ✓ 清晰的分支說明
  ✓ 推薦的開發方案
  ✓ 快速開始指南

建議:
  1. 先讀 README.md (了解全局)
  2. 選擇一個版本 (推薦 Web)
  3. 按照對應文檔開發
  4. 參考詳細的實現指南

祝你開發順利！🚀

═════════════════════════════════════════════════════════════
```
