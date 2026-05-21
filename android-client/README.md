# Android Client

此資料夾已補齊可編譯的 Android 最小專案（Kotlin + Compose + Retrofit）。

## 快速啟動

1. 用 Android Studio 開啟 `android-client`。
2. 等待 Gradle Sync 完成。
3. 選擇模擬器或實機後執行 Run。

## 目前已接好

- `MainActivity` + Compose 首頁
- `NetworkModule`（Retrofit + OkHttp）
- `FoodAnalysisViewModel` / `Repository`
- 點擊按鈕可送出測試 Base64 到 BFF `/api/v1/analyze-food`

## BFF 位址設定

- 檔案：`app/src/main/java/com/foodlens/advisor/network/NetworkModule.kt`
- 模擬器建議：`http://10.0.2.2:8080/`
- 實體手機請改成你電腦在同網段的 IP，例如：`http://192.168.1.10:8080/`

## 下一步

- CameraX 拍照與壓縮串接到 `ImageEncoder`
- 將測試 payload 換成實拍圖片 Base64
- AI 真實 provider（OpenAI / Gemini）待後續補上
