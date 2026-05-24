/**
 * YOLOFoodDetector — ONNX Runtime Web 版
 * 主要模型: milliy-taomlar-detector-best.onnx（46 類中亞料理）
 * 備援模型: COCO-SSD（TensorFlow.js，通用物件含食物）
 * 策略: ONNX 先跑，偵測不到時自動換 COCO-SSD
 */

class YOLOFoodDetector {
  constructor() {
    this.session = null;
    this.isReady = false;
    this.inputSize = 640;
    this.modelPath = "./models/food/milliy-taomlar-detector-best.onnx";
    this.confidenceThreshold = 0.25;
    this.iouThreshold = 0.45;

    this.cocoModel = null;

    this.labels = [
      "kebab", "layer cake", "shashlik", "samosa", "greens",
      "mashed potato", "chicken", "rice", "unknown", "manti",
      "onion", "beef", "tomato", "peas", "potato",
      "soup", "egg", "pilaf", "cucumber", "sauce",
      "nori", "lagman", "pomegranate", "blinchik", "dolma",
      "pepper", "mashkichiri", "chickpea soup", "stuffed vine leaves", "dolma2",
      "cutlet", "cheese", "sausage", "macaroni", "olivier salad",
      "corn", "caviar", "salad", "meatball", "shashlik2",
      "cabbage rolls", "pozharskiy cutlet", "carrot", "fried macaroni",
      "jarkop stew", "beans"
    ];

    this.zhMap = {
      "kebab": "烤肉串", "layer cake": "千層蛋糕", "shashlik": "烤肉",
      "samosa": "薩摩薩角", "greens": "蔬菜", "mashed potato": "馬鈴薯泥",
      "chicken": "雞肉", "rice": "米飯", "unknown": "未知食物",
      "manti": "中亞蒸餃", "onion": "洋蔥", "beef": "牛肉",
      "tomato": "番茄", "peas": "豌豆", "potato": "馬鈴薯",
      "soup": "湯", "egg": "雞蛋", "pilaf": "手抓飯",
      "cucumber": "黃瓜", "sauce": "醬料", "nori": "海苔",
      "lagman": "拉麵（中亞）", "pomegranate": "石榴", "blinchik": "薄煎餅",
      "dolma": "葡萄葉捲", "pepper": "辣椒", "mashkichiri": "豆豆粥",
      "chickpea soup": "鷹嘴豆湯", "stuffed vine leaves": "釀葡萄葉",
      "dolma2": "釀蔬菜", "cutlet": "炸肉排", "cheese": "起司",
      "sausage": "香腸", "macaroni": "通心粉", "olivier salad": "奧利維沙拉",
      "corn": "玉米", "caviar": "魚子醬", "salad": "沙拉",
      "meatball": "肉丸", "shashlik2": "烤串", "cabbage rolls": "高麗菜捲",
      "pozharskiy cutlet": "波扎爾斯基排", "carrot": "紅蘿蔔",
      "fried macaroni": "炒通心粉", "jarkop stew": "燉菜", "beans": "豆類"
    };

    // COCO-SSD 食物相關類別 → 中文
    this.cocoFoodMap = {
      "banana": "香蕉",
      "apple": "蘋果",
      "sandwich": "漢堡/三明治",
      "orange": "橘子",
      "broccoli": "花椰菜",
      "carrot": "紅蘿蔔",
      "hot dog": "熱狗",
      "pizza": "披薩",
      "donut": "甜甜圈",
      "cake": "蛋糕",
      "bowl": "碗（食物）",
      "cup": "飲料杯",
      "wine glass": "葡萄酒杯",
      "bottle": "飲料瓶"
    };
  }

  async init() {
    console.log("[FoodDetector] 載入 ONNX 模型中...");
    try {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all"
      });

      this.isReady = true;
      console.log("[FoodDetector] ✅ ONNX 模型載入成功（46 類食物）");
    } catch (e) {
      console.error("[FoodDetector] ❌ ONNX 模型載入失敗:", e);
      this.isReady = false;
    }
  }

  async detectFood(imageElement) {
    // 1. 嘗試 ONNX 模型（中亞料理）
    let detections = [];
    if (!this.isReady) {
      try { await this.init(); } catch (_) {}
    }

    if (this.isReady) {
      try {
        detections = await this._runOnnx(imageElement);
        console.log(`[FoodDetector] ONNX 結果: ${detections.length} 個偵測`);
      } catch (e) {
        console.warn("[FoodDetector] ONNX 推理失敗，改用 COCO-SSD:", e.message);
      }
    }

    // 2. ONNX 無結果時備援 COCO-SSD
    if (detections.length === 0) {
      console.log("[FoodDetector] ONNX 無結果，嘗試 COCO-SSD...");
      try {
        detections = await this._runCocoSSD(imageElement);
        console.log(`[FoodDetector] COCO-SSD 結果: ${detections.length} 個偵測`);
      } catch (e) {
        console.warn("[FoodDetector] COCO-SSD 失敗:", e.message);
      }
    }

    if (detections.length === 0) {
      return {
        food_items: [],
        confidence_scores: [],
        description: "未偵測到食物，請嘗試上傳更清晰的圖片",
        model_used: "none",
        boxes: []
      };
    }

    const food_items = detections.map(d => d.zhLabel || d.label);
    const confidence_scores = detections.map(d => Math.round(d.score * 1000) / 1000);
    const description = food_items
      .map((name, i) => `${name} (${(confidence_scores[i] * 100).toFixed(1)}%)`)
      .join("、");

    console.log("[FoodDetector] 最終結果:", description);

    return {
      food_items,
      confidence_scores,
      description,
      model_used: detections[0]._source || "unknown",
      boxes: detections.map(d => d.box || [0, 0, 0, 0]),
      raw_labels: detections.map(d => d.label)
    };
  }

  async _runOnnx(imageElement) {
    const { tensor, ratio, padW, padH } = this._preprocess(imageElement);
    const srcW = imageElement.naturalWidth || imageElement.width;
    const srcH = imageElement.naturalHeight || imageElement.height;

    const inputName = this.session.inputNames[0];
    const feeds = { [inputName]: tensor };
    const results = await this.session.run(feeds);

    const outputName = this.session.outputNames[0];
    const outputTensor = results[outputName];
    const output = outputTensor.data;
    const dims = outputTensor.dims;

    // 自動判斷維度佈局 [1, 50, 8400] 或 [1, 8400, 50]
    const d1 = dims[1], d2 = dims[2];
    const numAnchors = d1 > d2 ? d2 : d1;
    const numAttrs   = d1 > d2 ? d1 : d2;
    const isTransposed = d1 < d2; // [1, 8400, 50] → transposed

    console.log(`[FoodDetector] ONNX dims: [${dims}], numAttrs=${numAttrs}, numAnchors=${numAnchors}, transposed=${isTransposed}`);

    const numClasses = numAttrs - 4;
    const boxes = [];

    for (let a = 0; a < numAnchors; a++) {
      const idx = (attr) => isTransposed ? a * numAttrs + attr : attr * numAnchors + a;

      const cx = output[idx(0)];
      const cy = output[idx(1)];
      const w  = output[idx(2)];
      const h  = output[idx(3)];

      let maxScore = 0, maxClass = 0;
      for (let c = 0; c < numClasses; c++) {
        const score = output[idx(4 + c)];
        if (score > maxScore) { maxScore = score; maxClass = c; }
      }

      if (maxScore < this.confidenceThreshold) continue;
      if (maxClass >= this.labels.length) continue;
      if (w < 4 || h < 4) continue;

      const x1 = Math.max(0, ((cx - w / 2) - padW) / ratio);
      const y1 = Math.max(0, ((cy - h / 2) - padH) / ratio);
      const x2 = Math.min(srcW, ((cx + w / 2) - padW) / ratio);
      const y2 = Math.min(srcH, ((cy + h / 2) - padH) / ratio);

      if ((x2 - x1) < 4 || (y2 - y1) < 4) continue;

      boxes.push({
        label: this.labels[maxClass],
        zhLabel: this.zhMap[this.labels[maxClass]] || this.labels[maxClass],
        score: maxScore,
        box: [x1, y1, x2, y2],
        _source: "onnx-milliy"
      });
    }

    return this._nms(boxes);
  }

  async _runCocoSSD(imageElement) {
    if (!this.cocoModel) {
      if (typeof cocoSsd === "undefined") {
        throw new Error("COCO-SSD 未載入");
      }
      this.cocoModel = await cocoSsd.load();
      console.log("[FoodDetector] COCO-SSD 模型載入完成");
    }

    const predictions = await this.cocoModel.detect(imageElement);
    const results = [];

    for (const p of predictions) {
      const zhLabel = this.cocoFoodMap[p.class];
      if (!zhLabel) continue; // 只取食物相關類別
      if (p.score < 0.3) continue;

      const [x, y, w, h] = p.bbox;
      results.push({
        label: p.class,
        zhLabel,
        score: p.score,
        box: [x, y, x + w, y + h],
        _source: "coco-ssd"
      });
    }

    return results;
  }

  _preprocess(imageElement) {
    const canvas = document.createElement("canvas");
    canvas.width = this.inputSize;
    canvas.height = this.inputSize;
    const ctx = canvas.getContext("2d");

    const srcW = imageElement.naturalWidth || imageElement.width;
    const srcH = imageElement.naturalHeight || imageElement.height;
    const ratio = Math.min(this.inputSize / srcW, this.inputSize / srcH);
    const newW = Math.round(srcW * ratio);
    const newH = Math.round(srcH * ratio);
    const padW = (this.inputSize - newW) / 2;
    const padH = (this.inputSize - newH) / 2;

    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, this.inputSize, this.inputSize);
    ctx.drawImage(imageElement, padW, padH, newW, newH);

    const imageData = ctx.getImageData(0, 0, this.inputSize, this.inputSize);
    const pixels = imageData.data;
    const len = this.inputSize * this.inputSize;
    const float32 = new Float32Array(3 * len);

    for (let i = 0; i < len; i++) {
      float32[i]           = pixels[i * 4]     / 255;
      float32[i + len]     = pixels[i * 4 + 1] / 255;
      float32[i + len * 2] = pixels[i * 4 + 2] / 255;
    }

    return {
      tensor: new ort.Tensor("float32", float32, [1, 3, this.inputSize, this.inputSize]),
      ratio, padW, padH
    };
  }

  _nms(boxes) {
    boxes.sort((a, b) => b.score - a.score);
    const kept = [];
    for (const box of boxes) {
      let suppress = false;
      for (const k of kept) {
        if (this._iou(box.box, k.box) > this.iouThreshold) { suppress = true; break; }
      }
      if (!suppress) kept.push(box);
    }
    return kept.slice(0, 10);
  }

  _iou(a, b) {
    const ix1 = Math.max(a[0], b[0]), iy1 = Math.max(a[1], b[1]);
    const ix2 = Math.min(a[2], b[2]), iy2 = Math.min(a[3], b[3]);
    const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
    const aArea = (a[2] - a[0]) * (a[3] - a[1]);
    const bArea = (b[2] - b[0]) * (b[3] - b[1]);
    return inter / (aArea + bArea - inter + 1e-6);
  }

  getStatus() {
    return {
      isReady: this.isReady,
      modelType: "milliy-taomlar-onnx + coco-ssd",
      totalClasses: this.labels.length + Object.keys(this.cocoFoodMap).length,
      modelPath: this.modelPath
    };
  }
}

const foodDetector = new YOLOFoodDetector();
