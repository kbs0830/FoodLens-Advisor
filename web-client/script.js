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

// 初始狀態
statusEl.className = 'status idle';
statusEl.innerHTML = '點擊按鈕測試 BFF 連線';
