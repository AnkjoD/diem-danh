import cv2
import numpy as np
import urllib.request
from src.detector import FaceDetector

def main():
    print("Initializing detector...")
    detector = FaceDetector(model_path="./models/detector.onnx")
    detector.prepare(ctx_id=-1, nms_thresh=0.4)
    print("Detector initialized.")
    
    # Download a test face image
    url = "https://raw.githubusercontent.com/opencv/opencv/master/samples/data/lena.jpg"
    req = urllib.request.urlopen(url)
    arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
    img = cv2.imdecode(arr, -1)
    
    print(f"Downloaded image shape: {img.shape}")
    
    # Test 1: 640x640
    res1 = detector.detect(img, thresh=0.4, input_size=(640, 640))
    if res1 is not None and len(res1) >= 2 and res1[0] is not None:
        print(f"Test 640x640: Detected {res1[0].shape[0]} faces")
    else:
        print("Test 640x640: No faces detected")

    # Test 2: 1280x1280
    res2 = detector.detect(img, thresh=0.4, input_size=(1280, 1280))
    if res2 is not None and len(res2) >= 2 and res2[0] is not None:
        print(f"Test 1280x1280: Detected {res2[0].shape[0]} faces")
    else:
        print("Test 1280x1280: No faces detected")

if __name__ == "__main__":
    main()
