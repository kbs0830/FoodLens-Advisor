# Android Client Skeleton

此資料夾提供 Android（Kotlin）串接 FoodLens BFF 的第一版骨架。

## 建議模組

- `network/`: Retrofit API 介面與 DTO
- `data/`: Repository 與資料轉換
- `ui/`: Compose 畫面與 ViewModel

## 串接重點

- Base URL 指向你的 BFF，例如：`http://10.0.2.2:8080/`
- 影像先壓縮再 Base64，避免超過 API 限制
- 回傳 JSON 可直接渲染到進度條與建議區塊
