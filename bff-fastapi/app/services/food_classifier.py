from functools import lru_cache
import os
from typing import List, Tuple

from PIL import Image
import io
import base64

try:
    import torch
    import torchvision.transforms as T
    import torchvision.models as models
    from huggingface_hub import hf_hub_download
except Exception:
    torch = None


def _decode_image(image_base64: str) -> Image.Image:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


@lru_cache(maxsize=1)
def _load_model():
    """載入分類模型：
    - 若設定 FOOD_MODEL_REPO，嘗試從 Hugging Face repo 下載權重與 labels.txt
    - 否則回退到 ImageNet-pretrained ResNet50（準確性較差，但可用）
    """
    if torch is None:
        raise RuntimeError("torch 未安裝，請在虛擬環境中安裝依賴")

    repo = os.getenv("FOOD_MODEL_REPO", "")
    model = None
    labels = None

    # 優先嘗試本地權重（即使沒有設定 FOOD_MODEL_REPO）以方便開發與 self-generated 權重
    try:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
        local_weights = None
        for name in ("pytorch_model.bin", "model.pth", "weights.pt", "best.pt", "self_generated_weights.pth"):
            local_candidate = os.path.join(repo_root, name)
            if os.path.exists(local_candidate):
                local_weights = local_candidate
                break

        if local_weights:
            weights_path = local_weights
            labels_path = os.path.join(repo_root, "labels.txt") if os.path.exists(os.path.join(repo_root, "labels.txt")) else None

            model = models.resnet50(pretrained=False)
            state = torch.load(weights_path, map_location="cpu")
            if isinstance(state, dict) and "state_dict" in state:
                state = state["state_dict"]

            new_state = {}
            for k, v in state.items():
                nk = k
                if k.startswith("module."):
                    nk = k[len("module.") :]
                if k.startswith("model."):
                    nk = nk[len("model.") :]
                new_state[nk] = v

            if any(k.startswith("vit.") for k in new_state.keys()):
                raise RuntimeError("Checkpoint appears to be ViT-style weights; loader expects ResNet-format for this path")

            try:
                model.load_state_dict(new_state)
            except Exception:
                base_model = models.resnet50(pretrained=True)
                model = base_model
                if "fc.weight" in new_state:
                    try:
                        num_classes = int(new_state["fc.weight"].shape[0])
                        model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
                    except Exception:
                        pass
                model.load_state_dict(new_state, strict=False)

            device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
            model.to(device)
            model.eval()

            if labels_path:
                try:
                    with open(labels_path, "r", encoding="utf-8") as f:
                        labels = [l.strip() for l in f.readlines() if l.strip()]
                except Exception:
                    labels = None

            # 嘗試載入本地 food101 標籤檔
            if labels is None:
                local_labels = os.path.join(os.path.dirname(__file__), os.pardir, "food101_labels.txt")
                try:
                    with open(local_labels, "r", encoding="utf-8") as f:
                        labels = [l.strip() for l in f.readlines() if l.strip()]
                except Exception:
                    labels = None

            return model, labels, "local"
    except Exception:
        # 若本地載入失敗，繼續往下嘗試 HF 或回退
        pass

    if repo:
        # 期待 repo 至少包含 weights (pth/pt) 與 labels.txt
        try:
            # 先嘗試在本地目錄尋找權重檔（方便開發時直接放檔）
            weights_path = None
            repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
            for name in ("pytorch_model.bin", "model.pth", "weights.pt", "best.pt", "self_generated_weights.pth"):
                local_candidate = os.path.join(repo_root, name)
                if os.path.exists(local_candidate):
                    weights_path = local_candidate
                    break

            # 若本地找不到，才嘗試從 Hugging Face 下載
            if weights_path is None:
                for name in ("pytorch_model.bin", "model.pth", "weights.pt", "best.pt"):
                    try:
                        weights_path = hf_hub_download(repo_id=repo, filename=name)
                        break
                    except Exception:
                        weights_path = None

            labels_path = None
            try:
                labels_path = hf_hub_download(repo_id=repo, filename="labels.txt")
            except Exception:
                labels_path = None

            if weights_path is None:
                raise RuntimeError("在指定的 Hugging Face repo 找不到權重檔，請確認 repo 內容")

            # 使用 ResNet50 架構並載入權重（自動調整最後一層以配合 checkpoint 的類別數）
            # 先建立一個 ResNet50 基礎模型
            model = models.resnet50(pretrained=False)
            state = torch.load(weights_path, map_location="cpu")
            if isinstance(state, dict) and "state_dict" in state:
                state = state["state_dict"]

            # 移除常見的 module. 或 model. 前綴
            new_state = {}
            for k, v in state.items():
                nk = k
                if k.startswith("module."):
                    nk = k[len("module.") :]
                if k.startswith("model."):
                    nk = nk[len("model.") :]
                new_state[nk] = v

            # 若 checkpoint 為 ViT 等非 ResNet 權重，key 會包含 'vit.'，則拋出讓上層回退
            if any(k.startswith("vit.") for k in new_state.keys()):
                raise RuntimeError("Checkpoint appears to be ViT-style weights; loader expects ResNet-format for this path")

            # 嘗試直接載入完整 state dict
            try:
                model.load_state_dict(new_state)
            except Exception:
                # 若失敗，嘗試用 ImageNet 預訓練權重為基底，再載入 checkpoint（allow partial load）
                try:
                    base_model = models.resnet50(pretrained=True)
                    model = base_model
                    # 若 checkpoint 含有 fc 的權重，調整最後一層輸出數
                    if "fc.weight" in new_state:
                        try:
                            num_classes = int(new_state["fc.weight"].shape[0])
                            model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
                        except Exception:
                            pass
                    # 使用 strict=False 允許只載入部分權重（例如只替換 fc）
                    model.load_state_dict(new_state, strict=False)
                except Exception:
                    raise
            # 若有 GPU，將模型移到 CUDA
            device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
            model.to(device)
            model.eval()

            if labels_path:
                with open(labels_path, "r", encoding="utf-8") as f:
                    labels = [l.strip() for l in f.readlines() if l.strip()]

            # 嘗試載入本地 food101 標籤檔（當 HF repo 缺少 labels.txt 時使用）
            if labels is None:
                local_labels = os.path.join(os.path.dirname(__file__), os.pardir, "food101_labels.txt")
                try:
                    with open(local_labels, "r", encoding="utf-8") as f:
                        labels = [l.strip() for l in f.readlines() if l.strip()]
                except Exception:
                    labels = None

            return model, labels, f"hf:{repo}"

        except Exception as e:
            # 如果失敗則回退至 ImageNet
            print(f"[WARN] 從 HF 下載模型失敗: {e}，回退至 ImageNet 模型")

    # 回退：ImageNet-pretrained ResNet50
    model = models.resnet50(pretrained=True)
    model.eval()
    # 若專案包含本地 Food-101 標籤檔，嘗試載入以提供可讀標籤
    local_labels = os.path.join(os.path.dirname(__file__), os.pardir, "food101_labels.txt")
    labels = None
    try:
        with open(local_labels, "r", encoding="utf-8") as f:
            labels = [l.strip() for l in f.readlines() if l.strip()]
    except Exception:
        labels = None

    return model, labels, "resnet50-imagenet"


def _preprocess(img: Image.Image) -> 'torch.Tensor':
    transform = T.Compose([
        T.Resize(256),
        T.CenterCrop(224),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return transform(img).unsqueeze(0)


def classify_food_from_base64(image_base64: str, topk: int = 5) -> Tuple[List[Tuple[str, float]], str, str]:
    """回傳 top-k 預測 (label, prob)，模型名稱與來源說明
    若模型沒有 labels，則會回傳 ImageNet 類別名稱或類別 id
    """
    img = _decode_image(image_base64)
    model, labels, model_name = _load_model()

    if torch is None:
        raise RuntimeError("torch 未安裝")

    input_tensor = _preprocess(img)
    # 將輸入移到與模型相同的裝置
    try:
        model_device = next(model.parameters()).device
        input_tensor = input_tensor.to(model_device)
    except StopIteration:
        pass
    with torch.no_grad():
        outputs = model(input_tensor)
        probs = torch.nn.functional.softmax(outputs[0], dim=0)
        topk_vals, topk_idx = torch.topk(probs, k=topk)

    results = []
    for val, idx in zip(topk_vals.tolist(), topk_idx.tolist()):
        if labels and idx < len(labels):
            label = labels[idx]
        else:
            # 若無 labels，就用類別 id
            label = f"class_{idx}"
        results.append((label, float(val)))

    return results, model_name, ("有 Food-101 標籤" if labels else "無 Food-101 標籤（回退到 ImageNet）")
