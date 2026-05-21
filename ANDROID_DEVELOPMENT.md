# 📱 Android 開發完整指南

**版本**: v0.1.0  
**分支**: `main`  
**狀態**: ⏸️ 功能完整但暫停維護  

---

## ⚠️ 重要提示

本 Android 版本已轉向維護模式。**強烈推薦改用 Web 版本** (`web-dev` 分支)，原因如下：

| 指標 | Android | Web |
|------|---------|-----|
| 開發成本 | 高 | 低 ✅ |
| 部署複雜度 | 中 | 簡單 ✅ |
| Token 成本 | $8.00 | $0.0008 ✅ |
| 跨平台 | 否 | 是 ✅ |
| 快速迭代 | 否 | 是 ✅ |

**如果你想用 Android，繼續閱讀。否則請查看 [WEB_DEVELOPMENT.md](WEB_DEVELOPMENT.md)**

---

## 📋 目錄

1. [項目概述](#項目概述)
2. [環境設置](#環境設置)
3. [項目結構](#項目結構)
4. [核心功能](#核心功能)
5. [開發指南](#開發指南)
6. [部署步驟](#部署步驟)
7. [常見問題](#常見問題)

---

## 📱 項目概述

### 應用特性

- ✅ **Jetpack Compose UI** - 現代化 Android UI 框架
- ✅ **相機直拍** - 立即拍攝食物
- ✅ **本地儲存** - Room Database 存儲分析記錄
- ✅ **Material Design 3** - 符合最新設計規範
- ✅ **即時分析** - 實時顯示營養統計

### 技術棧

```
Kotlin
    ↓
Jetpack Compose
    ↓
Retrofit + OkHttp (網絡)
    ↓
Room Database (本地存儲)
    ↓
CameraX (相機)
```

---

## 🛠️ 環境設置

### 前置要求

- ✅ Android Studio 2023.1+
- ✅ JDK 11+
- ✅ Android SDK (API 28+)
- ✅ Git

### 安裝步驟

```bash
# 1. 克隆項目
git clone https://github.com/your-repo/FoodLens-Advisor.git
cd FoodLens-Advisor

# 2. 切換到 main 分支 (Android 版本)
git checkout main

# 3. 用 Android Studio 打開
# File → Open → 選擇 android-client 文件夾

# 4. 等待 Gradle Sync 完成
# Build → Make Project

# 5. 連接 Android 設備或模擬器
# Run → Run 'app'
```

### 首次啟動檢查

```
□ Gradle 同步成功
□ 沒有編譯錯誤
□ 模擬器/設備連接成功
□ 應用成功安裝
```

---

## 📁 項目結構

```
android-client/
│
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/foodlens/advisor/
│   │       │   ├── FoodLensApp.kt         主應用類
│   │       │   ├── MainActivity.kt         主活動
│   │       │   │
│   │       │   ├── data/
│   │       │   │   └── FoodAnalysisRepository.kt    數據層
│   │       │   │
│   │       │   ├── network/
│   │       │   │   ├── FoodLensApi.kt    API 接口
│   │       │   │   ├── Models.kt         網絡模型
│   │       │   │   └── NetworkModule.kt  依賴注入
│   │       │   │
│   │       │   ├── ui/
│   │       │   │   ├── FoodAnalysisScreen.kt
│   │       │   │   ├── FoodAnalysisScreenV2.kt
│   │       │   │   └── FoodAnalysisViewModel.kt
│   │       │   │
│   │       │   └── util/
│   │       │       └── ImageEncoder.kt
│   │       │
│   │       └── res/
│   │           └── values/
│   │               ├── strings.xml
│   │               └── themes.xml
│   │
│   ├── build.gradle.kts        應用級配置
│   └── proguard-rules.pro       混淆規則
│
├── build.gradle.kts            項目級配置
├── settings.gradle.kts         項目設置
├── gradle.properties            Gradle 屬性
│
└── gradle/wrapper/              Gradle 包裝器
    └── gradle-wrapper.properties
```

---

## ✨ 核心功能

### 1. 食物拍攝

```kotlin
// CameraX 集成
val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
val imageCapture = ImageCapture.Builder().build()

// 拍攝食物
imageCapture.takePicture(
    ContextCompat.getMainExecutor(context),
    object : ImageCapture.OnImageCapturedCallback() {
        override fun onCaptureSuccess(image: ImageProxy) {
            // 處理拍攝的圖像
            analyzeFood(image)
        }
    }
)
```

### 2. 食物分析

```kotlin
// 發送到 BFF 後端
suspend fun analyzeFood(imageBase64: String): AnalysisResult {
    return foodLensApi.analyzeFood(
        AnalyzeFoodRequest(
            image_base64 = imageBase64,
            locale = "zh-TW"
        )
    )
}
```

### 3. 本地儲存

```kotlin
// Room Database
@Entity(tableName = "analysis_history")
data class FoodAnalysis(
    @PrimaryKey val id: Int,
    val foodItems: String,
    val calories: Float,
    val timestamp: Long
)

@Dao
interface FoodAnalysisDao {
    @Query("SELECT * FROM analysis_history")
    fun getAll(): List<FoodAnalysis>
}
```

### 4. Jetpack Compose UI

```kotlin
@Composable
fun FoodAnalysisScreen(viewModel: FoodAnalysisViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // 相機按鈕
        Button(onClick = { viewModel.capturePhoto() }) {
            Text("📸 拍攝食物")
        }
        
        // 結果顯示
        if (viewModel.analysisResult != null) {
            FoodResultCard(viewModel.analysisResult!!)
        }
    }
}
```

---

## 🚀 開發指南

### 開發流程

```
1. 設計界面 (Compose)
   ↓
2. 實現邏輯 (ViewModel)
   ↓
3. 集成網絡 (Retrofit)
   ↓
4. 本地測試 (JUnit)
   ↓
5. 真機測試 (真實設備)
   ↓
6. 優化性能
   ↓
7. 打包發佈
```

### 添加新功能

#### 例：添加收藏功能

**第1步**: 創建 UI

```kotlin
@Composable
fun FavoriteButton(
    isFavorite: Boolean,
    onToggle: () -> Unit
) {
    IconButton(onClick = onToggle) {
        Icon(
            imageVector = if (isFavorite) Icons.Filled.Favorite 
                          else Icons.Outlined.Favorite,
            contentDescription = "Favorite"
        )
    }
}
```

**第2步**: 更新 ViewModel

```kotlin
class FoodAnalysisViewModel : ViewModel() {
    fun toggleFavorite(foodId: String) {
        viewModelScope.launch {
            repository.addToFavorites(foodId)
        }
    }
}
```

**第3步**: 更新 Repository

```kotlin
class FoodAnalysisRepository {
    suspend fun addToFavorites(foodId: String) {
        database.favoriteDao().insert(Favorite(foodId))
    }
}
```

### 本地測試

```bash
# 單元測試
./gradlew test

# 集成測試 (真機)
./gradlew connectedAndroidTest

# UI 測試
./gradlew cAT
```

---

## 📦 部署步驟

### 構建 APK

```bash
# Debug APK (用於測試)
./gradlew assembleDebug
# 輸出: app/build/outputs/apk/debug/app-debug.apk

# Release APK (用於發佈)
./gradlew assembleRelease
# 輸出: app/build/outputs/apk/release/app-release.apk
```

### 簽名 APK

```bash
# 1. 創建密鑰庫
keytool -genkey -v -keystore my-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# 2. 在 build.gradle.kts 中配置
signingConfigs {
    release {
        keyStore = file("path/to/my-release-key.jks")
        keyStorePassword = "password"
        keyAlias = "my-key-alias"
        keyPassword = "password"
    }
}

# 3. 構建簽名 APK
./gradlew assembleRelease
```

### 上傳到 Google Play

```
1. 創建 Google Play 開發者帳戶 ($25)
2. 進入 Google Play Console
3. 創建新應用
4. 上傳簽名 APK
5. 填寫應用信息
6. 提交審核
7. 等待審核完成（通常 1-3 天）
8. 發佈！
```

---

## 🆘 常見問題

### Q: Gradle Sync 失敗？
**A**: 
```bash
# 清除快取
./gradlew clean

# 重新同步
./gradlew build
```

### Q: 模擬器太慢？
**A**: 使用硬件加速：
```
Android Studio → Settings → System Settings → 
Emulator
Enable GPU → VulkanRenderer 或 OpenGLES
```

### Q: 相機權限問題？
**A**: 檢查 AndroidManifest.xml：
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- 運行時權限請求 -->
ActivityCompat.requestPermissions(
    this,
    arrayOf(Manifest.permission.CAMERA),
    PERMISSION_CODE
)
```

### Q: 如何測試 BFF 連接？
**A**: 
```kotlin
// 在 ViewModel 中測試
fun testBFFConnection() {
    viewModelScope.launch {
        try {
            val response = foodLensApi.health()
            Log.d("BFF", "連接成功: ${response.status}")
        } catch (e: Exception) {
            Log.e("BFF", "連接失敗: ${e.message}")
        }
    }
}
```

### Q: 如何分享分析結果？
**A**:
```kotlin
fun shareAnalysis(analysis: FoodAnalysis) {
    val shareIntent = Intent().apply {
        action = Intent.ACTION_SEND
        putExtra(Intent.EXTRA_TEXT, analysis.summary())
        type = "text/plain"
    }
    startActivity(Intent.createChooser(shareIntent, "分享"))
}
```

---

## 📈 性能優化

### 圖像優化

```kotlin
// 壓縮圖像大小
fun compressImage(bitmap: Bitmap): Bitmap {
    val maxWidth = 1024
    val maxHeight = 1024
    val scale = minOf(
        maxWidth.toFloat() / bitmap.width,
        maxHeight.toFloat() / bitmap.height
    )
    
    return Bitmap.createScaledBitmap(
        bitmap,
        (bitmap.width * scale).toInt(),
        (bitmap.height * scale).toInt(),
        true
    )
}
```

### 網絡優化

```kotlin
// 使用 OkHttp 攔截器
val httpClient = OkHttpClient.Builder()
    .addInterceptor(HttpLoggingInterceptor())
    .connectTimeout(30, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .build()
```

### 內存優化

```kotlin
// 使用 ViewModel 保存數據
class FoodAnalysisViewModel : ViewModel() {
    // 數據保留在內存中，不會因旋轉屏幕而丟失
    private val _analysisResult = MutableLiveData<AnalysisResult>()
    val analysisResult: LiveData<AnalysisResult> = _analysisResult
}
```

---

## 🧪 測試策略

### JUnit 單元測試

```kotlin
class FoodLensApiTest {
    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()
    
    private lateinit var api: FoodLensApi
    
    @Before
    fun setup() {
        api = Retrofit.Builder()
            .baseUrl("http://127.0.0.1:8080")
            .build()
            .create(FoodLensApi::class.java)
    }
    
    @Test
    fun testHealthCheck() {
        val response = api.health().execute()
        assertTrue(response.isSuccessful)
    }
}
```

### Compose UI 測試

```kotlin
@get:Rule
val composeTestRule = createComposeRule()

@Test
fun testFoodAnalysisScreen() {
    composeTestRule.setContent {
        FoodAnalysisScreen(viewModel)
    }
    
    composeTestRule.onNodeWithText("📸 拍攝食物").performClick()
    composeTestRule.onNodeWithText("分析結果").assertIsDisplayed()
}
```

---

## 📚 相關資源

### 官方文檔
- [Android 開發文檔](https://developer.android.com/)
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Kotlin 文檔](https://kotlinlang.org/docs/)

### 項目文檔
- [README.md](README.md)
- [WEB_DEVELOPMENT.md](WEB_DEVELOPMENT.md)

---

## 🎯 下一步

### 短期
- [ ] 完成 UI 優化
- [ ] 單元測試覆蓋
- [ ] 真機測試

### 中期
- [ ] Google Play 上線
- [ ] 用戶反饋集成
- [ ] 性能優化

### 長期
- [ ] 推薦菜譜系統
- [ ] 社區分享功能
- [ ] 廣告/商業化

---

## ⚠️ 維護提示

由於項目已轉向 Web 版本，以下項目可能不再更新：

- ❌ 新功能開發
- ❌ 依賴更新
- ⚠️ Bug 修復 (需要時進行)

**如有需要，請切換到 `web-dev` 分支使用 Web 版本。**

---

## 🎉 結論

Android 版本是 **功能完整** 的解決方案，但：

- ❌ 成本高 (10,000 倍)
- ❌ 開發複雜
- ❌ 發佈困難
- ❌ 維護成本高

**對於新項目，強烈推薦使用 Web 版本！** 🌐

---

**祝你開發順利！**
