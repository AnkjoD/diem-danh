import os
import urllib.request

MODELS = {
    "detector.onnx": "https://github.com/deepinsight/insightface/raw/master/model_zoo/detection/scrfd/onnx/scrfd_500m_bnkps.onnx",
    "recognizer.onnx": "https://github.com/deepinsight/insightface/raw/master/model_zoo/recognition/arcface_torch/onnx/w600lk_r50.onnx",
}

def download_models():
    base_path = "ai/models"
    os.makedirs(base_path, exist_ok=True)
    
    for name, url in MODELS.items():
        path = os.path.join(base_path, name)
        if not os.path.exists(path):
            print(f"Downloading {name}...")
            try:
                urllib.request.urlretrieve(url, path)
                print(f"Done.")
            except Exception as e:
                print(f"Error downloading {name}: {e}")
        else:
            print(f"{name} already exists.")

if __name__ == "__main__":
    download_models()
