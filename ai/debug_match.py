import sys
import os
sys.path.append('/app')
import cv2
import numpy as np
from src.detector import FaceDetector
from src.aligner import FaceAligner
from src.recognizer import FaceRecognizer
from src.matcher import FaceMatcher

def main():
    img_path = sys.argv[1]
    img = cv2.imread(img_path)
    if img is None:
        print("Could not read image")
        return

    print(f"Loaded image: {img.shape}")
    
    # Init models
    detector = FaceDetector(model_path="/app/models/detector.onnx")
    detector.prepare(ctx_id=-1, nms_thresh=0.4)
    aligner = FaceAligner()
    recognizer = FaceRecognizer(model_path="/app/models/recognizer.onnx")
    matcher = FaceMatcher(dimension=512, index_file="/app/databases/db.bin", map_file="/app/databases/db.json")
    
    print(f"DB size: {matcher.index.ntotal}")

    from main import get_face_data
    results = get_face_data(img, "recognize")
    
    if not results:
        print("No faces detected")
        return
        
    for i, res in enumerate(results):
        print(f"Face {i}: BBox {res['bbox']}")
        student_id, distance = matcher.search_face(res["embedding"], threshold=1.2)
        print(f"   Match: {student_id}, Distance: {distance:.4f}")

if __name__ == "__main__":
    main()
