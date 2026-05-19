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
                <strong>🎯 建議：</strong> ${data.next_meal_suggestion}
            </div>
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

    // 顯示預覽
    const reader = new FileReader();
    reader.onload = async (e) => {
        previewImage.src = e.target.result;
        previewImage.style.display = 'block';
        
        // 開始 YOLO 檢測
        await performYoloDetection(previewImage);
    };
    reader.readAsDataURL(file);
}

/**
 * 執行 YOLO 檢測
 */
async function performYoloDetection(imageElement) {
    detectionStatus.style.display = 'block';
    detectionStatus.className = 'status loading';
    detectionStatus.innerHTML = '<span class="spinner"></span>🤖 正在執行 YOLO 檢測...';
    
    try {
        // 載入模型（第一次）
        if (!detector.isLoaded) {
            detectionStatus.innerHTML = '<span class="spinner"></span>載入 YOLO 模型中...';
            const modelLoaded = await detector.loadModel();
            if (!modelLoaded) {
                throw new Error('模型載入失敗');
            }
        }

        // 執行檢測
        const detections = await detector.detectFood(imageElement);
        
        // 顯示檢測結果
        displayYoloResults(detections);
        
        // 發送到後端進行 AI 分析
        await analyzeWithBackend(detections);
        
    } catch (error) {
        detectionStatus.className = 'status error';
        detectionStatus.innerHTML = `❌ 檢測失敗: ${error.message}`;
        console.error('YOLO 檢測錯誤:', error);
    }
}

/**
 * 顯示 YOLO 檢測結果
 */
function displayYoloResults(detections) {
    detectionStatus.className = 'status success';
    detectionStatus.innerHTML = `✅ YOLO 檢測完成！檢測到 ${detections.detection_count} 種食物`;
    
    detectionResult.style.display = 'block';
    detectionResult.innerHTML = `
        <div class="detection-card">
            <h3>🔍 YOLO 檢測結果</h3>
            <div class="detection-item">
                <strong>檢測到的食物：</strong>
                <ul>
                    ${detections.food_items.map((item, i) => 
                        `<li>${item} (信心度: ${Math.round(detections.confidence_scores[i] * 100)}%)</li>`
                    ).join('')}
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
        // 檢查後端是否有新的 /api/v1/analyze-text 端點
        // 如果沒有，則回退到原始 /api/v1/analyze-food 端點
        
        const payload = {
            food_items: yoloResults.food_items,
            description: yoloResults.description,
            locale: 'zh-TW'
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
            // 回退到舊的 analyze-food 端點
            console.warn('新端點不可用，嘗試舊端點...');
            await fallbackToOldEndpoint(yoloResults);
            return;
        }

        const analysisResult = await response.json();
        displayResult(analysisResult);
        
    } catch (error) {
        console.error('後端分析失敗:', error);
        detectionResult.innerHTML += `<p style="color: red;">❌ 後端分析失敗: ${error.message}</p>`;
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
