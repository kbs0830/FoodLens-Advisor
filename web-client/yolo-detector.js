/**
 * YOLO Food Detection Module
 * 使用 COCO-SSD 進行食物檢測
 * 目標: 將圖像轉換為食物標籤文字，發送到後端進行 AI 分析
 */

const FOOD_CATEGORIES = [
    'apple', 'banana', 'orange', 'carrot', 'broccoli', 'chicken', 'beef', 
    'fish', 'bread', 'rice', 'egg', 'milk', 'cheese', 'potato', 'tomato',
    'lettuce', 'cucumber', 'pizza', 'sandwich', 'salad', 'soup', 'noodles',
    'steak', 'pork', 'shrimp', 'crab', 'lobster', 'pepperoni', 'spaghetti',
    'burger', 'hot dog', 'donut', 'cake', 'cookie', 'coffee', 'tea',
    'water bottle', 'wine glass', 'beer glass'
];

class YOLOFoodDetector {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.detectionResults = null;
    }

    /**
     * 載入 COCO-SSD 模型
     */
    async loadModel() {
        console.log('🤖 正在載入 YOLO 模型...');
        try {
            this.model = await cocoSsd.load();
            this.isLoaded = true;
            console.log('✅ YOLO 模型載入成功！');
            return true;
        } catch (error) {
            console.error('❌ 模型載入失敗:', error);
            return false;
        }
    }

    /**
     * 偵測圖像中的食物
     * @param {HTMLImageElement} imageElement - 圖像元素
     * @returns {Promise<Object>} 檢測結果
     */
    async detectFood(imageElement) {
        if (!this.isLoaded) {
            await this.loadModel();
        }

        console.log('🔍 正在分析圖像...');
        try {
            const predictions = await this.model.estimateObjects(imageElement);
            
            // 篩選食物相關類別
            const foodDetections = predictions.filter(pred => 
                this.isFoodCategory(pred.class)
            );

            if (foodDetections.length === 0) {
                console.warn('⚠️ 未檢測到食物');
                return this._generateEmptyResult();
            }

            // 轉換為結構化格式
            const result = this._formatDetections(foodDetections);
            this.detectionResults = result;
            
            console.log('✅ 檢測完成:', result);
            return result;

        } catch (error) {
            console.error('❌ 檢測失敗:', error);
            return this._generateEmptyResult();
        }
    }

    /**
     * 檢查是否為食物類別
     */
    isFoodCategory(className) {
        const normalizedClass = className.toLowerCase();
        
        // 直接檢查清單
        if (FOOD_CATEGORIES.includes(normalizedClass)) {
            return true;
        }

        // 關鍵字檢查
        const foodKeywords = [
            'food', 'fruit', 'vegetable', 'meat', 'fish', 'chicken', 
            'beef', 'pork', 'bread', 'rice', 'pasta', 'noodle', 'dish',
            'plate', 'bowl', 'pizza', 'burger', 'sandwich', 'salad',
            'soup', 'ice cream', 'cake', 'cookie', 'donut', 'coffee',
            'tea', 'juice', 'milk', 'cheese', 'egg', 'apple', 'orange',
            'banana', 'carrot', 'potato', 'tomato', 'onion', 'garlic'
        ];

        return foodKeywords.some(keyword => normalizedClass.includes(keyword));
    }

    /**
     * 格式化檢測結果
     */
    _formatDetections(detections) {
        // 按信心度排序並去重
        const foodItems = detections
            .sort((a, b) => b.score - a.score)
            .map(d => ({
                item: d.class,
                confidence: Math.round(d.score * 100) / 100
            }));

        // 去除重複的食物
        const uniqueFoods = [];
        const seenItems = new Set();
        
        for (const food of foodItems) {
            if (!seenItems.has(food.item.toLowerCase())) {
                uniqueFoods.push(food);
                seenItems.add(food.item.toLowerCase());
            }
        }

        // 生成自然語言描述
        const description = this._generateDescription(uniqueFoods);

        return {
            food_items: uniqueFoods.map(f => f.item),
            confidence_scores: uniqueFoods.map(f => f.confidence),
            description: description,
            detection_count: uniqueFoods.length,
            raw_detections: uniqueFoods
        };
    }

    /**
     * 生成自然語言描述
     */
    _generateDescription(foods) {
        if (foods.length === 0) {
            return '無法識別食物';
        }

        const items = foods.slice(0, 5).map((f, i) => {
            const confidence = Math.round(f.confidence * 100);
            return `${f.item} (${confidence}% 信心度)`;
        }).join(', ');

        const ending = foods.length > 5 ? `及其他 ${foods.length - 5} 種食物` : '';

        return `檢測到: ${items}${ending}。`;
    }

    /**
     * 生成空結果
     */
    _generateEmptyResult() {
        return {
            food_items: [],
            confidence_scores: [],
            description: '無法識別食物，請嘗試上傳更清晰的圖像。',
            detection_count: 0,
            raw_detections: []
        };
    }

    /**
     * 繪製檢測結果到 Canvas
     */
    drawDetections(imageElement, canvas, detections) {
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;

        // 繪製圖像
        ctx.drawImage(imageElement, 0, 0);

        // 繪製邊界框
        detections.raw_detections.forEach(detection => {
            // 注: COCO-SSD 不提供邊界框座標，只提供分類
            // 實際應用中需要使用完整的 YOLO 模型來獲取邊界框
            console.log(`檢測到: ${detection.item} (${detection.confidence})`);
        });
    }
}

// 全局實例
const detector = new YOLOFoodDetector();
