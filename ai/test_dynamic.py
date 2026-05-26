import cv2
import numpy as np
from src.detector import FaceDetector

def main():
    print("Initializing detector...")
    detector = FaceDetector(model_path="./models/detector.onnx")
    detector.prepare(ctx_id=-1, nms_thresh=0.4)
    print("Detector initialized.")
    print("Model input size:", detector.input_size)
    
    # Try dynamic input
    try:
        dummy_img = np.zeros((1280, 1280, 3), dtype=np.uint8)
        res = detector.detect(dummy_img, thresh=0.5, input_size=(1280, 1280))
        print("Model supports dynamic 1280x1280!")
    except Exception as e:
        print("Model DOES NOT support dynamic 1280x1280:", e)

if __name__ == "__main__":
    main()
