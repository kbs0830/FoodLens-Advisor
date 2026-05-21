# FoodLens Advisor Android 系統架構表（LLM Vision API）

開門見山，這是一份專為串接 LLM Vision API 開發的 Android 飲食分析 App 系統架構表。
架構設計採取「輕量化客戶端（Thin Client）+ 雲端大腦」策略，以確保開發效率與後期維護彈性。

## 核心系統架構總表

| 架構層級（Layer） | 模組名稱 | 推薦技術棧 | 核心功能與職責 |
|---|---|---|---|
| 展現層（Client） | 影像擷取模組 | Kotlin + CameraX | 負責調用相機、對焦控制，取得高畫質食物原始影像。 |
| 展現層（Client） | UI 渲染與互動 | Jetpack Compose | 構建首頁儀表板、掃描動畫（Skeleton Screen）及營養素數據圖表。 |
| 展現層（Client） | 資料傳輸模組 | Retrofit + OkHttp | 負責圖片壓縮（轉 Base64）與非同步 API 請求，處理網路例外。 |
| 中介層（Proxy/BFF） | 安全與路由控制 | Node.js（Express）或 Python（FastAPI） | 接收手機端請求；隱藏 AI API Key，防止被反編譯竊取，並實施頻率限制（Rate Limiting）。 |
| 中介層（Proxy/BFF） | 資料格式化 | JSON 解析器 | 攔截並清理 AI 回傳資料，確保回傳手機端的 JSON 結構統一且無亂碼。 |
| AI 引擎層（AI Services） | 視覺辨識 API | OpenAI GPT-4o Vision 或 Google Gemini Pro Vision | 解析圖片，辨識食物種類並估算份量。 |
| AI 引擎層（AI Services） | 決策與邏輯控制 | Prompt Engineering | 注入結構化提示詞，嚴格校驗是否符合高蛋白、零澱粉、零酒精、清淡不辣等營養標準，並生成建議。 |
| 資料持久層（Storage） | 本地快取 | Room Database（SQLite） | 儲存使用者歷史飲食紀錄與每日熱量累計，支援離線查看。 |
| 資料持久層（Storage） | 圖床與雲端儲存（選配） | AWS S3 或 Firebase Storage | 若需保留使用者拍攝的食物歷史照片，可先上傳圖床，再將 URL 傳給 AI。 |

## 模組間資料流向（Data Flow）

1. 使用者端觸發：透過 CameraX 拍下餐點（例如水煮雞胸肉與花椰菜）。
2. App 內部預處理：Kotlin 背景執行緒壓縮圖片，確保檔案大小在 API 限制內，降低傳輸延遲。
3. 發送中介請求：App 透過 Retrofit 將圖片發送至自建中介伺服器（Proxy Server）。
4. 中介層發起 AI 請求：伺服器夾帶受保護 API Key 與預設「嚴格飲食過濾 Prompt」，向 LLM Vision API 請求。
5. AI 解析與回傳：LLM 分析總熱量與巨量營養素，中介層以純 JSON 格式回傳手機端。
6. UI 渲染與同步：Jetpack Compose 接收 JSON，即時繪製蛋白質達標進度條，顯示下一餐調整建議，並同步寫入 Room。

## 專案來源

- Repository: https://github.com/kbs0830/FoodLens-Advisor.git
