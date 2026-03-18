from src.interfaces import IFaceAligner
from typing import Optional
import numpy as np
import cv2
REFERENCE_FACIAL_POINTS: np.ndarray = np.array([
    [38.2946, 51.6963],
    [73.5318, 51.5014],
    [56.0252, 71.7366],
    [41.5493, 92.3655],
    [70.7299, 92.2041]
], dtype=np.float32)

class FaceAligner(IFaceAligner):
    def align(self, image: np.ndarray, landmarks: np.ndarray) -> np.ndarray:
        tform, _ = cv2.estimateAffinePartial2D(
            landmarks.astype(np.float32), 
            REFERENCE_FACIAL_POINTS, 
            method=cv2.LMEDS
        )
        
        if tform is None:
            return cv2.resize(image, (112, 112))
            
        aligned_face: np.ndarray = cv2.warpAffine(
            image, 
            tform, 
            (112, 112), 
            borderValue=0.0
        )
        
        return aligned_face