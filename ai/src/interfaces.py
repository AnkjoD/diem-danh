import numpy as np
from dataclasses import dataclass
from typing import List, Tuple, Optional, Protocol

@dataclass
class BoundingBox:
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    score: float
    
@dataclass
class FaceData:
    bbox: BoundingBox
    landmarks: np.ndarray
    aligned_face: Optional[np.ndarray] = None
    embedding: Optional[np.ndarray] = None
    student_id: Optional[str] = None
    similarity_score: Optional[float] = None

    
class IFaceDetector(Protocol):
    def detect(self, image: np.ndarray) -> List[FaceData]:
        ...
class IFaceAligner(Protocol):
    def align(self, image: np.ndarray, landmarks: np.ndarray) -> np.ndarray:
        ...
        
class IFaceRecognizer(Protocol):
    def extract(self, aligned_face: np.ndarray) -> np.ndarray:
        ...