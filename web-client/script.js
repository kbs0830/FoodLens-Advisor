const BFF_URL = 'http://127.0.0.1:8080';
const BACKEND_READY_TIMEOUT_MS = 15000;
const BACKEND_READY_INTERVAL_MS = 1000;

const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const testBtn = document.getElementById('testBtn');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const FOOD_DISPLAY_ALIASES = {
    dishqozonkabob: 'kebab', dishxonim: 'layer cake', dishshashlik: 'shashlik',
    dishsomsa: 'samosa', ingkokat: 'greens', 'ingkartoshka-pure': 'mashed potato',
    'ingtovuq-goshti': 'chicken', ingguruch: 'rice', dishunknown: 'unknown',
    dishmanti: 'manti', ingpiyoz: 'onion', inggosht: 'beef',
    ingpomidor: 'tomato', ingnoxat: 'peas', ingkartoshka: 'potato',
    dishshorva: 'soup', ingtuxum: 'egg', dishosh: 'pilaf',
    ingbodring: 'cucumber', ingsous: 'sauce', dishnorin: 'nori',
    dishlagmon: 'lagman', inganor: 'pomegranate', dishbilinchik: 'blinchik',
    dishdolma: 'dolma', ingqalampir: 'pepper', dishmoshkichra: 'mashkichiri',
    dishnoxatshorva: 'chickpea soup', dishtokdolma: 'stuffed vine leaves',
    ingdolma: 'dolma', ingkatlet: 'cutlet', ingpishloq: 'cheese',
    ingsosiska: 'sausage', ingmakaron: 'macaroni', disholivye: 'olivier salad',
    ingmakkajoxori: 'corn', ingikra: 'caviar', ingsalat: 'salad',
    ingteftel: 'meatball', ingshashlik: 'shashlik', inggolupsi: 'cabbage rolls',
    'dishpojarskiy-kotleti': 'pozharskiy cutlet', ingsabzi: 'carrot',
    dishqovurmamakaron: 'fried macaroni', dishjarkop: 'jarkop stew', ingloviya: 'beans',
    meatball: 'meatball',
};

function formatModelClassLabel(label) {
    const text = String(label || '').trim();
    if (!text) return '';
    return FOOD_DISPLAY_ALIASES[text.toLowerCase()] || text;
}

// ── 後端等待工具 ──────────────────────────────────────────────────

async function waitForBackendReady(timeoutMs = BACKEND_READY_TIMEOUT_MS, intervalMs = BACKEND_READY_INTERVAL_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${BFF_URL}/health`);
            if (response.ok) return true;
        } catch (_) {}
        await sleep(intervalMs);
    }
    return false;
}

async function fetchWithBackendRetry(url, options = {}, retryMessage = '等待後端就緒中...', onWaiting = null) {
    try {
        return await fetch(url, options);
    } catch (error) {
        console.warn(`[WARN] ${retryMessage}`, error);
        if (typeof onWaiting === 'function') onWaiting();
        const ready = await waitForBackendReady();
        if (!ready) throw new Error('後端在等待逾時內仍未就緒');
        if (typeof onWaiting === 'function') onWaiting(true);
        return await fetch(url, options);
    }
}

// ── 連線測試 ──────────────────────────────────────────────────────

async function testConnection() {
    testBtn.disabled = true;
    statusEl.innerHTML = '<span class="spinner"></span>連線中...';
    statusEl.className = 'status loading';
    resultEl.innerHTML = '';

    try {
        let response = await fetch(`${BFF_URL}/health`);
        if (!response.ok) {
            statusEl.innerHTML = '<span class="spinner"></span>正在等待後端啟動...';
            const ready = await waitForBackendReady();
            if (!ready) throw new Error(`HTTP ${response.status}`);
            response = await fetch(`${BFF_URL}/health`);
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        statusEl.innerHTML = `✅ 連線成功！ BFF 狀態：${data.status}　請上傳食物圖片開始分析。`;
        statusEl.className = 'status success';
    } catch (error) {
        statusEl.innerHTML = `❌ 連線失敗：${error.message}`;
        statusEl.className = 'status error';
    } finally {
        testBtn.disabled = false;
    }
}

// ── 結果顯示 ──────────────────────────────────────────────────────

function displayResult(data) {
    const proteinProgress = Math.min((data.macros.protein_g / 40) * 100, 100);
    const carbsProgress   = Math.min((data.macros.carbs_g / 60) * 100, 100);
    const fatProgress     = Math.min((data.macros.fat_g / 30) * 100, 100);
    const displayFoodItems = Array.isArray(data.food_items) ? data.food_items : [];

    const nextMealOptions = Array.isArray(data.next_meal_options) ? data.next_meal_options.filter(Boolean) : [];
    const nutritionTips   = Array.isArray(data.nutrition_tips) ? data.nutrition_tips.filter(Boolean) : [];
    const dietWarnings    = Array.isArray(data.diet_warnings) ? data.diet_warnings.filter(Boolean) : [];
    const confidenceNote  = (data.confidence_note || '').trim();

    const rulesHtml = [
        ['高蛋白', data.rule_check.high_protein],
        ['低澱粉', data.rule_check.zero_starch],
        ['零酒精', data.rule_check.zero_alcohol],
        ['清淡不辣', data.rule_check.mild_not_spicy],
    ].map(([label, passed]) =>
        `<span class="rule-item ${passed ? 'pass' : 'fail'}">${passed ? '✅' : '❌'} ${label}</span>`
    ).join('');

    resultEl.innerHTML = `
        <div class="result-card">
            <h3>🍽️ AI 飲食分析結果</h3>

            <div class="result-item">
                <strong>偵測到的食物：</strong> ${displayFoodItems.join('、') || '（無）'}
            </div>

            <div class="result-item" style="text-align:center;padding:18px 20px;">
                <strong>🔥 預估熱量</strong>
                <div><span class="calorie-value">${data.estimated_calories_kcal}</span><span class="calorie-unit">kcal</span></div>
            </div>

            <div class="result-item">
                <strong>📊 巨量營養素：</strong>
                <div class="macro-row">
                    <span>💪 蛋白質 ${data.macros.protein_g}g</span>
                    <div class="progress-bar"><div class="progress-fill" style="width:${proteinProgress}%"></div></div>
                </div>
                <div class="macro-row">
                    <span>🌾 碳水 ${data.macros.carbs_g}g</span>
                    <div class="progress-bar"><div class="progress-fill carbs" style="width:${carbsProgress}%"></div></div>
                </div>
                <div class="macro-row">
                    <span>🧈 脂肪 ${data.macros.fat_g}g</span>
                    <div class="progress-bar"><div class="progress-fill fat" style="width:${fatProgress}%"></div></div>
                </div>
            </div>

            <div class="result-item">
                <strong>飲食評估：</strong>
                <div class="rules-check">${rulesHtml}</div>
            </div>

            <div class="result-item ai-conclusion">
                <strong>🧠 AI 分析：</strong><br>${data.ai_conclusion || data.next_meal_suggestion}
            </div>

            ${nextMealOptions.length > 0 ? `
            <div class="result-item">
                <strong>🍱 下一餐建議：</strong>
                <ul>${nextMealOptions.map(i => `<li>${i}</li>`).join('')}</ul>
            </div>` : ''}

            ${nutritionTips.length > 0 ? `
            <div class="result-item">
                <strong>📌 營養提示：</strong>
                <ul>${nutritionTips.map(i => `<li>${i}</li>`).join('')}</ul>
            </div>` : ''}

            ${dietWarnings.length > 0 ? `
            <div class="result-item">
                <strong>⚠️ 飲食警告：</strong>
                <ul>${dietWarnings.map(i => `<li>${i}</li>`).join('')}</ul>
            </div>` : ''}

            ${confidenceNote ? `<div class="result-item"><small>🔍 ${confidenceNote}</small></div>` : ''}
        </div>`;
}

// ── 圖片上傳與 ONNX 偵測 ─────────────────────────────────────────

const imageInput = document.getElementById('imageInput');
const uploadArea = document.getElementById('uploadArea');
const previewImage = document.getElementById('previewImage');
const detectionStatus = document.getElementById('detectionStatus');
const detectionResult = document.getElementById('detectionResult');

function initializeEventListeners() {
    imageInput.addEventListener('change', handleImageSelect);
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#e8f5e9';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.backgroundColor = '';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            imageInput.files = e.dataTransfer.files;
            handleImageSelect();
        }
    });
}

function selectImage() {
    imageInput.click();
}

async function handleImageSelect() {
    const file = imageInput.files[0];
    if (!file) return;

    detectionResult.style.display = 'none';
    detectionResult.innerHTML = '';
    resultEl.innerHTML = '';
    detectionStatus.innerHTML = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
        previewImage.src = e.target.result;
        previewImage.style.display = 'block';
        await performYoloDetection(previewImage);
    };
    reader.readAsDataURL(file);
}

// ── 核心：前端 ONNX 偵測 ─────────────────────────────────────────

async function performYoloDetection(imageElement) {
    detectionStatus.style.display = 'block';
    detectionStatus.className = 'status loading';
    detectionStatus.innerHTML = '<span class="spinner"></span>🤖 載入 ONNX 模型中...';

    try {
        // 確保圖片已完全載入
        if (!imageElement.complete || imageElement.naturalWidth === 0) {
            await new Promise(resolve => { imageElement.onload = resolve; });
        }

        // 載入模型（第一次才載入，之後直接用）
        if (!foodDetector.isReady) {
            await foodDetector.init();
        }

        detectionStatus.innerHTML = '<span class="spinner"></span>🔍 偵測食物中...';

        // 執行前端 ONNX 推理
        const onnxResult = await foodDetector.detectFood(imageElement);

        // 轉換格式
        const detections = {
            food_items: onnxResult.food_items,
            confidence_scores: onnxResult.confidence_scores,
            description: onnxResult.description,
            detection_count: onnxResult.food_items.length,
            average_confidence: onnxResult.confidence_scores.length > 0
                ? onnxResult.confidence_scores.reduce((a, b) => a + b, 0) / onnxResult.confidence_scores.length
                : 0,
            confidence_threshold: foodDetector.confidenceThreshold || 0.25,
            model_name: onnxResult.model_used || 'food-detector',
            model_classes: [],
        };

        if (detections.food_items.length === 0) {
            detectionStatus.className = 'status warning';
            detectionStatus.innerHTML = `⚠️ 未偵測到食物（門檻 ${Math.round((detections.confidence_threshold || 0.25) * 100)}%），請嘗試上傳更清晰的圖片`;
            detectionResult.style.display = 'none';
            resultEl.innerHTML = '';
            return;
        }

        displayYoloResults(detections);
        await analyzeWithBackend(detections);

    } catch (error) {
        detectionStatus.className = 'status error';
        detectionStatus.innerHTML = `❌ 偵測失敗: ${error.message}`;
        console.error('ONNX 偵測錯誤:', error);
    }
}

// ── 顯示偵測結果 ─────────────────────────────────────────────────

function displayYoloResults(detections) {
    const thresholdPercent = Math.round((detections.confidence_threshold || 0.35) * 100);
    const averagePercent = Math.round((detections.average_confidence || 0) * 100);

    if (detections.detection_count === 0) {
        detectionStatus.className = 'status warning';
        detectionStatus.innerHTML = `⚠️ YOLO 檢測完成，但未識別到食物（門檻 ${thresholdPercent}%）`;
    } else {
        detectionStatus.className = 'status success';
        detectionStatus.innerHTML = `✅ 檢測到 ${detections.detection_count} 種食物（門檻 ${thresholdPercent}%）`;
    }

    detectionResult.style.display = 'block';

    const foodListHtml = detections.food_items.map((item, i) =>
        `<li><span class="badge">${Math.round((detections.confidence_scores[i] || 0) * 100)}%</span> ${item}</li>`
    ).join('');

    detectionResult.innerHTML = `
        <div class="detection-card">
            <h3>🔍 YOLO 檢測結果</h3>
            <div class="detection-item">
                <strong>檢測到的食物：</strong>
                <ul>${foodListHtml}</ul>
            </div>
            <div class="detection-item">
                <strong>偵測門檻：</strong> ${thresholdPercent}%
                <strong>平均信心度：</strong> ${averagePercent}%
            </div>
        </div>`;
}

// ── 後端 AI 分析 ─────────────────────────────────────────────────

async function analyzeWithBackend(yoloResults) {
    if (!yoloResults.food_items || yoloResults.food_items.length === 0) return;

    if (typeof showAIOverlay === 'function') showAIOverlay();

    try {
        const scores = yoloResults.confidence_scores || [];
        const avgConf = scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        const payload = {
            food_items: yoloResults.food_items || [],
            description: yoloResults.description || '未檢測到食物',
            locale: 'zh-TW',
            detector_build: window.YOLO_DETECTOR_BUILD || 'onnx-frontend-v1',
            detection_meta: {
                detection_count: yoloResults.detection_count || 0,
                average_confidence: Math.round(avgConf * 100) / 100,
            },
        };

        console.log('📤 發送到後端:', payload);

        const response = await fetchWithBackendRetry(`${BFF_URL}/api/v1/analyze-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }, '等待文字分析服務就緒中...', () => {
            detectionResult.innerHTML += `<p><small>⏳ 正在等待後端啟動...</small></p>`;
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const analysisResult = await response.json();
        if (typeof hideAIOverlay === 'function') hideAIOverlay();
        displayResult({
            ...analysisResult,
            model_name: yoloResults.model_name,
            model_classes: yoloResults.model_classes,
        });
        detectionResult.innerHTML += `<p style="color:#43a047;margin-top:8px;"><small>✅ AI 分析完成</small></p>`;

    } catch (error) {
        if (typeof hideAIOverlay === 'function') hideAIOverlay();
        console.error('後端分析失敗:', error);
        detectionResult.innerHTML += `<p style="color:red;"><small>❌ AI 分析失敗: ${error.message}</small></p>`;
        resultEl.innerHTML = `<div class="result-card"><p style="color:red;padding:20px;">⚠️ Gemini 分析失敗，請確認 API 金鑰設定與網路連線。<br><small>${error.message}</small></p></div>`;
    }
}

function useCamera() {
    alert('相機功能開發中...');
}

// ── 初始化 ───────────────────────────────────────────────────────

statusEl.className = 'status idle';
statusEl.innerHTML = '點擊按鈕測試 BFF 連線';
initializeEventListeners();