const BFF_URL = 'http://127.0.0.1:8080';

const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const testBtn = document.getElementById('testBtn');

async function testConnection() {
    testBtn.disabled = true;
    statusEl.innerHTML = '<span class="spinner"></span>連線中...';
    statusEl.className = 'status loading';
    resultEl.innerHTML = '';

    try {
        const response = await fetch(`${BFF_URL}/health`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        statusEl.innerHTML = `✅ 連線成功！<br><small>BFF 狀態：${data.status}</small>`;
        statusEl.className = 'status success';
        
        // 自動進行食物分析測試
        await analyzeSampleFood();
    } catch (error) {
        statusEl.innerHTML = `❌ 連線失敗<br><small>${error.message}</small>`;
        statusEl.className = 'status error';
    } finally {
        testBtn.disabled = false;
    }
}

async function analyzeSampleFood() {
    try {
        const payload = {
            image_base64: 'Zm9vZGxlbnNfZHVtbXk=',
            locale: 'zh-TW'
        };

        const response = await fetch(`${BFF_URL}/api/v1/analyze-food`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        displayResult(data);
    } catch (error) {
        console.error('分析失敗：', error);
    }
}

function displayResult(data) {
    const proteinProgress = Math.min((data.macros.protein_g / 40) * 100, 100);

    const nextMealOptions = Array.isArray(data.next_meal_options)
        ? data.next_meal_options.filter(Boolean)
        : [];
    const nutritionTips = Array.isArray(data.nutrition_tips)
        ? data.nutrition_tips.filter(Boolean)
        : [];
    const dietWarnings = Array.isArray(data.diet_warnings)
        ? data.diet_warnings.filter(Boolean)
        : [];
    const confidenceNote = (data.confidence_note || '').trim();

    const nextMealOptionsHtml = nextMealOptions.length > 0
        ? `<ul>${nextMealOptions.map(item => `<li>${item}</li>`).join('')}</ul>`
        : '';
    const nutritionTipsHtml = nutritionTips.length > 0
        ? `<ul>${nutritionTips.map(item => `<li>${item}</li>`).join('')}</ul>`
        : '';
    const dietWarningsHtml = dietWarnings.length > 0
        ? `<ul>${dietWarnings.map(item => `<li>${item}</li>`).join('')}</ul>`
        : '';
    
    const rulesHtml = [
        ['高蛋白', data.rule_check.high_protein],
        ['零澱粉', data.rule_check.zero_starch],
        ['零酒精', data.rule_check.zero_alcohol],
        ['清淡不辣', data.rule_check.mild_not_spicy],
    ]
    .map(([label, passed]) => 
        `<div class="rule-item ${passed ? 'pass' : 'fail'}">
            ${passed ? '✅' : '❌'} ${label}
        </div>`
    )
    .join('');

    resultEl.innerHTML = `
        <div class="result-card">
            <h3>🍽️ 分析結果</h3>
            
            <div class="result-item">
                <strong>食物：</strong> ${data.food_items.join(', ')}
            </div>
            
            <div class="result-item">
                <strong>🔥 熱量：</strong> ${data.estimated_calories_kcal} kcal
            </div>
            
            <div class="result-item">
                <strong>💪 蛋白質：</strong> ${data.macros.protein_g}g
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${proteinProgress}%"></div>
                </div>
                <small>${Math.round(proteinProgress)}% 達成</small>
            </div>
            
            <div class="result-item">
                <strong>🥘 碳水：</strong> ${data.macros.carbs_g}g
            </div>
            
            <div class="result-item">
                <strong>🧈 脂肪：</strong> ${data.macros.fat_g}g
            </div>
            
            <div class="result-item">
                <strong>營養標準檢查：</strong>
                <div class="rules-check">
                    ${rulesHtml}
                </div>
            </div>

            <div class="result-item">
                <strong>🧠 AI 結語：</strong> ${data.ai_conclusion || data.next_meal_suggestion}
            </div>
            
            <div class="result-item">
                <strong>🎯 建議：</strong> ${data.next_meal_suggestion}
            </div>

            ${nextMealOptionsHtml ? `
            <div class="result-item">
                <strong>🍱 更多餐點建議：</strong>
                ${nextMealOptionsHtml}
            </div>
            ` : ''}

            ${nutritionTipsHtml ? `
            <div class="result-item">
                <strong>📌 營養提示：</strong>
                ${nutritionTipsHtml}
            </div>
            ` : ''}

            ${dietWarningsHtml ? `
            <div class="result-item">
                <strong>⚠️ 注意事項：</strong>
                ${dietWarningsHtml}
            </div>
            ` : ''}

            ${confidenceNote ? `
            <div class="result-item">
                <strong>🧪 可信度提示：</strong> ${confidenceNote}
            </div>
            ` : ''}
        </div>
    `;
}

// ==================== 新增 YOLO 檢測功能 ====================

const imageInput = document.getElementById('imageInput');
const uploadArea = document.getElementById('uploadArea');
const previewImage = document.getElementById('previewImage');
const detectionStatus = document.getElementById('detectionStatus');
const detectionResult = document.getElementById('detectionResult');

/**
 * 初始化事件監聽
 */
function initializeEventListeners() {
    // 文件上傳
    imageInput.addEventListener('change', handleImageSelect);

    // 拖拽上傳
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

/**
 * 選擇圖像
 */
function selectImage() {
    imageInput.click();
}

/**
 * 處理圖像選擇
 */
async function handleImageSelect() {
    const file = imageInput.files[0];
    if (!file) return;

    // 清空舊結果
    detectionResult.style.display = 'none';
    detectionResult.innerHTML = '';
    resultEl.innerHTML = '';
    detectionStatus.innerHTML = '';

    // 顯示預覽
    const reader = new FileReader();
    reader.onload = async (e) => {
        const imageDataUrl = e.target.result;
        previewImage.src = imageDataUrl;
        previewImage.style.display = 'block';
        
        // 開始 YOLO 檢測
        await performYoloDetection(previewImage, imageDataUrl);
    };
    reader.readAsDataURL(file);
}

/**
 * 執行 YOLO 檢測
 */
async function performYoloDetection(imageElement, imageBase64) {
    detectionStatus.style.display = 'block';
    detectionStatus.className = 'status loading';
    detectionStatus.innerHTML = '<span class="spinner"></span>🤖 正在執行食物偵測...';
    
    try {
        detectionStatus.innerHTML = '<span class="spinner"></span>連線到後端 YOLO 偵測中...';
        const detections = await detectFoodWithBackend(imageBase64);
        
        // 顯示檢測結果（即使食物為空也顯示）
        displayYoloResults(detections);
        
        // 無論是否檢測到食物，都發送到後端進行 AI 分析
        // 後端會在食物列表為空時使用 Mock 數據
        await analyzeWithBackend(detections);
        
    } catch (error) {
        detectionStatus.className = 'status error';
        detectionStatus.innerHTML = `❌ 檢測失敗: ${error.message}`;
        console.error('YOLO 檢測錯誤:', error);
        
        // 即使檢測失敗，也嘗試使用 Mock 數據進行分析
        console.log('嘗試使用 Mock 數據作為回退...');
        const emptyDetections = detector.getEmptyResult();
        displayYoloResults(emptyDetections);
        await analyzeWithBackend(emptyDetections);
    }
}

/**
 * 透過後端 YOLO 偵測食物
 */
async function detectFoodWithBackend(imageBase64) {
    const payload = {
        image_base64: imageBase64,
        locale: 'zh-TW',
        detector_build: window.YOLO_DETECTOR_BUILD || 'backend-yolo-v1',
    };

    const response = await fetch(`${BFF_URL}/api/v1/detect-food`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * 顯示 YOLO 檢測結果
 */
function displayYoloResults(detections) {
    if (detections.detection_count === 0) {
        detectionStatus.className = 'status warning';
        detectionStatus.innerHTML = `⚠️ YOLO 檢測完成，但未識別到食物`;
    } else {
        detectionStatus.className = 'status success';
        detectionStatus.innerHTML = `✅ YOLO 檢測完成！檢測到 ${detections.detection_count} 種食物`;
    }
    
    detectionResult.style.display = 'block';
    
    const foodListHtml = detections.food_items.length > 0
        ? detections.food_items.map((item, i) => 
            `<li>${item} (信心度: ${Math.round(detections.confidence_scores[i] * 100)}%)</li>`
        ).join('')
        : '<li style="color: #999;">無法識別具體食物</li>';
    
    detectionResult.innerHTML = `
        <div class="detection-card">
            <h3>🔍 YOLO 檢測結果</h3>
            <div class="detection-item">
                <strong>檢測到的食物：</strong>
                <ul>
                    ${foodListHtml}
                </ul>
            </div>
            <div class="detection-item">
                <strong>描述：</strong> ${detections.description}
            </div>
            <p><small>正在發送到後端進行 AI 分析...</small></p>
        </div>
    `;
}

/**
 * 將 YOLO 結果發送到後端進行 AI 分析
 */
async function analyzeWithBackend(yoloResults) {
    try {
        const confidenceScores = yoloResults.confidence_scores || [];
        const avgConfidence = confidenceScores.length > 0
            ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
            : 0;

        const payload = {
            food_items: yoloResults.food_items || [],
            description: yoloResults.description || '未檢測到食物',
            locale: 'zh-TW',
            detector_build: window.YOLO_DETECTOR_BUILD || 'unknown',
            detection_meta: {
                detection_count: yoloResults.detection_count || 0,
                average_confidence: Math.round(avgConfidence * 100) / 100
            }
        };

        console.log('📤 發送到後端:', payload);

        const response = await fetch(`${BFF_URL}/api/v1/analyze-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // 即使新端點失敗，也嘗試舊端點
            console.warn(`後端返回 ${response.status}，嘗試回退到舊端點...`);
            await fallbackToOldEndpoint(yoloResults);
            return;
        }

        const analysisResult = await response.json();
        displayResult(analysisResult);
        detectionResult.innerHTML += `<p style="color: #4CAF50;"><small>✅ AI 分析完成</small></p>`;
        
    } catch (error) {
        console.error('後端分析失敗:', error);
        detectionResult.innerHTML += `<p style="color: orange;"><small>⚠️ 分析結果錯誤: ${error.message}，使用 Mock 數據</small></p>`;
        
        // 最後的回退：使用 Mock 數據
        displayResult({
            food_items: ["chicken breast", "broccoli"],
            estimated_calories_kcal: 312.0,
            macros: { protein_g: 48.0, carbs_g: 8.0, fat_g: 9.0 },
            rule_check: {
                high_protein: true,
                zero_starch: false,
                zero_alcohol: true,
                mild_not_spicy: true
            },
            next_meal_suggestion: "下一餐可增加葉菜類與水分，維持蛋白質攝取。"
        });
    }
}

/**
 * 回退到舊的 analyze-food 端點（使用 mock 數據）
 */
async function fallbackToOldEndpoint(yoloResults) {
    try {
        // 將檢測到的食物轉換為 base64（保持原始接口相容性）
        const mockBase64 = 'Zm9vZGxlbnNfZHVtbXk=';
        
        const payload = {
            image_base64: mockBase64,
            locale: 'zh-TW'
        };

        const response = await fetch(`${BFF_URL}/api/v1/analyze-food`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const analysisResult = await response.json();
        displayResult(analysisResult);
        
    } catch (error) {
        console.error('回退分析失敗:', error);
        detectionResult.innerHTML += `<p style="color: red;">❌ 分析失敗: ${error.message}</p>`;
    }
}

/**
 * 使用相機（未來功能）
 */
function useCamera() {
    alert('相機功能開發中...');
    // TODO: 實現相機功能
}

// ==================== 初始化 ====================

// 初始狀態
statusEl.className = 'status idle';
statusEl.innerHTML = '點擊按鈕測試 BFF 連線';

// 初始化事件監聽
initializeEventListeners();
