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

const FOOD101_LABELS = [
    'apple pie', 'baby back ribs', 'baklava', 'beef carpaccio', 'beef tartare',
    'beet salad', 'beignets', 'bibimbap', 'bread pudding', 'breakfast burrito',
    'bruschetta', 'caesar salad', 'cannoli', 'caprese salad', 'carrot cake',
    'ceviche', 'cheesecake', 'cheese plate', 'chicken curry', 'chicken quesadilla',
    'chicken wings', 'chocolate cake', 'chocolate mousse', 'churros', 'clam chowder',
    'club sandwich', 'crab cakes', 'creme brulee', 'croque madame', 'cup cakes',
    'deviled eggs', 'donuts', 'dumplings', 'edamame', 'eggs benedict', 'escargots',
    'falafel', 'filet mignon', 'fish and chips', 'foie gras', 'french fries',
    'french onion soup', 'french toast', 'fried calamari', 'fried rice',
    'frozen yogurt', 'garlic bread', 'gnocchi', 'greek salad',
    'grilled cheese sandwich', 'grilled salmon', 'guacamole', 'gyoza', 'hamburger',
    'hot and sour soup', 'hot dog', 'huevos rancheros', 'hummus', 'ice cream',
    'lasagna', 'lobster bisque', 'lobster roll sandwich', 'macaroni and cheese',
    'macarons', 'miso soup', 'mussels', 'nachos', 'omelette', 'onion rings',
    'oysters', 'pad thai', 'paella', 'pancakes', 'panna cotta', 'peking duck',
    'pho', 'pizza', 'pork chop', 'poutine', 'prime rib', 'pulled pork sandwich',
    'ramen', 'ravioli', 'red velvet cake', 'risotto', 'samosa', 'sashimi',
    'scallops', 'seaweed salad', 'shrimp and grits', 'spaghetti bolognese',
    'spaghetti carbonara', 'spring rolls', 'steak', 'strawberry shortcake',
    'sushi', 'tacos', 'takoyaki', 'tiramisu', 'tuna tartare', 'waffles'
];

const YOLO_DETECTOR_BUILD = '2026-05-23-r1';
console.log(`[YOLO] detector build: ${YOLO_DETECTOR_BUILD}`);
window.YOLO_DETECTOR_BUILD = YOLO_DETECTOR_BUILD;

const PRIMARY_CONFIDENCE_THRESHOLD = 0.35;
const FALLBACK_CONFIDENCE_THRESHOLD = 0.55;
const CLASSIFIER_TOP_K = 5;
const CLASSIFIER_MIN_CONFIDENCE = 0.25;
const FOOD_CLASSIFIER_MODEL_URLS = [
    'models/food101/model.json',
    './models/food101/model.json',
    'https://storage.googleapis.com/tfjs-models/tfjs/food101/model.json'
];
const FOOD_CLASSIFIER_INPUT_SIZE = 224;
const FOOD_CLASSIFIER_ENABLED = true;

const NON_FOOD_OBJECTS = new Set([
    'person', 'dog', 'cat', 'car', 'truck', 'bus', 'train', 'bike',
    'motorcycle', 'tree', 'building', 'wall', 'floor', 'ceiling',
    'chair', 'sofa', 'bed', 'door', 'window', 'shoe', 'shirt', 'pants',
    'hat', 'phone', 'computer', 'monitor', 'keyboard', 'mouse'
]);

const FOOD_ALIAS_MAP = {
    'hot dog': 'hot dog',
    donut: 'donut',
    doughnut: 'donut',
    'wine glass': 'drink',
    bottle: 'drink',
    cup: 'drink',
    bowl: 'mixed meal',
    spoon: 'meal',
    fork: 'meal',
    knife: 'meal',
    plate: 'meal'
};

class YOLOFoodDetector {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.detectionResults = null;
        this.classifier = null;
        this.classifierLoaded = false;
        this.classifierLoadAttempted = false;
    }

    /**
     * 載入食物分類模型與 COCO-SSD 回退模型
     */
    async loadModel() {
        console.log('🤖 正在載入食物專用模型...');
        try {
            await this.loadClassifier();
            if (this.classifierLoaded) {
                this.isLoaded = true;
                console.log('✅ 食物分類模型載入成功！');
                return true;
            }

            console.warn('[WARN] 食物分類模型不可用，改用 COCO-SSD 作為回退');
            this.model = await cocoSsd.load();
            this.isLoaded = true;
            console.log('✅ COCO-SSD 回退模型載入成功！');
            return true;
        } catch (error) {
            console.error('❌ 模型載入失敗:', error);
            return false;
        }
    }

    /**
     * 載入食物分類模型（可選）
     */
    async loadClassifier() {
        if (!FOOD_CLASSIFIER_ENABLED) {
            return false;
        }
        if (this.classifierLoadAttempted) {
            return this.classifierLoaded;
        }
        this.classifierLoadAttempted = true;

        if (!window.tf || typeof tf.loadGraphModel !== 'function') {
            console.warn('[WARN] TFJS 未就緒，略過食物分類模型載入');
            return false;
        }

        for (const modelUrl of FOOD_CLASSIFIER_MODEL_URLS) {
            try {
                this.classifier = await tf.loadGraphModel(modelUrl);
                this.classifierLoaded = true;
                console.log(`[INFO] 食物分類模型載入成功: ${modelUrl}`);
                return true;
            } catch (error) {
                console.warn(`[WARN] 食物分類模型載入失敗: ${modelUrl} -> ${error.message}`);
            }
        }

        this.classifier = null;
        this.classifierLoaded = false;
        return false;
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
        if (!this.classifierLoaded) {
            await this.loadClassifier();
        }

        // 確保圖像完全加載
        return new Promise((resolve) => {
            if (imageElement.complete) {
                this._performDetection(imageElement).then(resolve);
            } else {
                imageElement.onload = () => {
                    this._performDetection(imageElement).then(resolve);
                };
                imageElement.onerror = () => {
                    console.error('❌ 圖像加載失敗');
                    resolve(this._generateEmptyResult());
                };
            }
        });
    }

    /**
     * 執行實際的檢測
     */
    async _performDetection(imageElement) {
        console.log('🔍 正在分析圖像...');
        try {
            // 相容不同模型 API：優先 detect()，舊版回退 estimateObjects()
            let predictions;
            if (this.model && typeof this.model.detect === 'function') {
                predictions = await this.model.detect(imageElement);
            } else if (this.model && typeof this.model.estimateObjects === 'function') {
                predictions = await this.model.estimateObjects(imageElement);
            } else {
                throw new TypeError('模型不支援 detect() 或 estimateObjects()');
            }
            
            console.log('📊 COCO-SSD 原始預測:', predictions);
            console.log('📊 檢測到的物體數量:', predictions.length);
            
            const classifierItems = await this._classifyFood(imageElement);

            if (classifierItems.length > 0) {
                const classifierResult = this._formatFoodItems(classifierItems);
                this.detectionResults = classifierResult;
                console.log('✅ 使用食物專用分類模型作為主結果:', classifierResult);
                return classifierResult;
            }

            // 篩選食物相關類別
            const foodDetections = predictions.filter(pred =>
                pred.score >= PRIMARY_CONFIDENCE_THRESHOLD && this.isFoodCategory(pred.class)
            );

            let mergedItems = this._mergeFoodItems(
                this._toFoodItems(foodDetections, 'detector'),
                classifierItems
            );

            if (mergedItems.length === 0) {
                console.warn('⚠️ 未檢測到明確食物，嘗試高信心候選項...');
                const fallbackDetections = predictions.filter(pred =>
                    pred.score >= FALLBACK_CONFIDENCE_THRESHOLD &&
                    !NON_FOOD_OBJECTS.has(pred.class.toLowerCase())
                );
                mergedItems = this._mergeFoodItems(
                    this._toFoodItems(fallbackDetections, 'detector'),
                    classifierItems
                );
            }

            if (mergedItems.length === 0) {
                console.warn('⚠️ 圖像中沒有檢測到任何物體');
                return this._generateEmptyResult();
            }

            // 轉換為結構化格式
            const result = this._formatFoodItems(mergedItems);
            this.detectionResults = result;
            
            console.log('✅ 檢測完成:', result);
            return result;

        } catch (error) {
            console.error('❌ 檢測失敗:', error);
            console.error('❌ 錯誤堆棧:', error.stack);
            return this._generateEmptyResult();
        }
    }

    /**
     * 檢查是否為食物類別
     */
    isFoodCategory(className) {
        const normalizedClass = className.toLowerCase();
        if (NON_FOOD_OBJECTS.has(normalizedClass)) {
            return false;
        }
        
        // 直接檢查清單
        if (FOOD_CATEGORIES.includes(normalizedClass)) {
            return true;
        }

        // 關鍵字檢查 - 更寬鬆的食物檢測
        const foodKeywords = [
            'food', 'fruit', 'vegetable', 'meat', 'fish', 'chicken', 
            'beef', 'pork', 'bread', 'rice', 'pasta', 'noodle', 'dish',
            'plate', 'bowl', 'pizza', 'burger', 'sandwich', 'salad',
            'soup', 'ice cream', 'cake', 'cookie', 'donut', 'coffee',
            'tea', 'juice', 'milk', 'cheese', 'egg', 'apple', 'orange',
            'banana', 'carrot', 'potato', 'tomato', 'onion', 'garlic',
            'sushi', 'ramen', 'taco', 'burrito', 'dumpling', 'noodles',
            'curry', 'steak', 'fries', 'dessert', 'pancake', 'waffle',
            'dining', 'restaurant', 'kitchen', 'prepared',
            'cooked', 'fresh', 'baked', 'grilled', 'fried', 'boiled'
        ];

        const isFood = foodKeywords.some(keyword => normalizedClass.includes(keyword));
        
        if (isFood) {
            return true;
        }

        return false;
    }

    normalizeFoodLabel(className) {
        const normalizedClass = className.toLowerCase();
        if (FOOD_ALIAS_MAP[normalizedClass]) {
            return FOOD_ALIAS_MAP[normalizedClass];
        }
        return normalizedClass;
    }

    /**
     * 格式化檢測結果
     */
    _formatFoodItems(foodItems) {
        const orderedItems = foodItems
            .sort((a, b) => b.confidence - a.confidence)
            .map(d => ({
                item: this.normalizeFoodLabel(d.item),
                confidence: Math.round(d.confidence * 100) / 100,
                source: d.source
            }));

        // 去除重複的食物
        const uniqueFoods = [];
        const seenItems = new Set();
        
        for (const food of orderedItems) {
            if (!seenItems.has(food.item.toLowerCase())) {
                uniqueFoods.push(food);
                seenItems.add(food.item.toLowerCase());
            }
        }

        const filteredFoods = uniqueFoods.filter(food => {
            if (food.item === 'meal' || food.item === 'mixed meal') {
                return food.confidence >= FALLBACK_CONFIDENCE_THRESHOLD;
            }
            return true;
        });

        // 生成自然語言描述
        const description = this._generateDescription(filteredFoods);

        return {
            food_items: filteredFoods.map(f => f.item),
            confidence_scores: filteredFoods.map(f => f.confidence),
            description: description,
            detection_count: filteredFoods.length,
            raw_detections: filteredFoods
        };
    }

    /**
     * 生成自然語言描述
     */
    _generateDescription(foods) {
        if (foods.length === 0) {
            return '無法識別食物';
        }

        const items = foods.slice(0, 5).map((f) => {
            const confidence = Math.round(f.confidence * 100);
            return `${f.item} (${confidence}% 信心度)`;
        }).join(', ');

        const ending = foods.length > 5 ? `及其他 ${foods.length - 5} 種食物` : '';
        const avgConfidence = Math.round(
            foods.reduce((sum, food) => sum + food.confidence, 0) / foods.length * 100
        );

        return `檢測到: ${items}${ending}。平均信心度約 ${avgConfidence}%。`;
    }

    /**
     * 生成空結果
     */
    _generateEmptyResult() {
        const emptyResult = {
            food_items: [],
            confidence_scores: [],
            description: '無法識別食物，請嘗試上傳更清晰的圖像。',
            detection_count: 0,
            raw_detections: []
        };
        console.warn('⚠️ 返回空結果:', emptyResult);
        return emptyResult;
    }

    _toFoodItems(detections, source) {
        return detections
            .sort((a, b) => b.score - a.score)
            .map(d => ({
                item: this.normalizeFoodLabel(d.class),
                confidence: d.score,
                source: source
            }));
    }

    _mergeFoodItems(detectorItems, classifierItems) {
        const merged = new Map();

        detectorItems.forEach(item => {
            merged.set(item.item.toLowerCase(), {
                item: item.item,
                confidence: item.confidence,
                source: item.source
            });
        });

        classifierItems.forEach(item => {
            const key = item.item.toLowerCase();
            if (!merged.has(key)) {
                merged.set(key, item);
                return;
            }
            const existing = merged.get(key);
            merged.set(key, {
                item: existing.item,
                confidence: Math.max(existing.confidence, item.confidence),
                source: `${existing.source}+${item.source}`
            });
        });

        return Array.from(merged.values());
    }

    async _classifyFood(imageElement) {
        if (!this.classifierLoaded || !this.classifier) {
            return [];
        }

        try {
            const input = tf.tidy(() => {
                const pixels = tf.browser.fromPixels(imageElement).toFloat();
                const resized = tf.image.resizeBilinear(
                    pixels,
                    [FOOD_CLASSIFIER_INPUT_SIZE, FOOD_CLASSIFIER_INPUT_SIZE]
                );
                return resized.div(255).expandDims(0);
            });

            let output = this.classifier.predict(input);
            if (Array.isArray(output)) {
                output = output[0];
            }

            const probs = tf.softmax(output);
            const data = await probs.data();

            tf.dispose([input, output, probs]);

            const topK = this._getTopK(data, FOOD101_LABELS, CLASSIFIER_TOP_K)
                .filter(item => item.confidence >= CLASSIFIER_MIN_CONFIDENCE)
                .map(item => ({
                    item: this.normalizeFoodLabel(item.item),
                    confidence: item.confidence,
                    source: 'classifier'
                }));

            return topK;
        } catch (error) {
            console.warn(`[WARN] 食物分類失敗: ${error.message}`);
            return [];
        }
    }

    _getTopK(probabilities, labels, k) {
        const scored = [];
        for (let i = 0; i < probabilities.length; i += 1) {
            scored.push({
                item: labels[i] || `class_${i}`,
                confidence: probabilities[i]
            });
        }

        return scored.sort((a, b) => b.confidence - a.confidence).slice(0, k);
    }

    /**
     * 公開方法：獲取空結果（用於前端回退）
     */
    getEmptyResult() {
        return this._generateEmptyResult();
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
