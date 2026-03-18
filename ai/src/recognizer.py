import cv2
import numpy as np
import onnxruntime as ort
from typing import List, Tuple
from src.interfaces import IFaceRecognizer

class FaceRecognizer(IFaceRecognizer):
    def __init__(self, model_path: str, providers: List[str]  = ['CPUExecutionProvider']) -> None:
        self.session: ort.InferenceSession = ort.InferenceSession(
            model_path, 
            providers=providers 
        )
        self.input_name: str = self.session.get_inputs()[0].name
        self.output_name: str = self.session.get_outputs()[0].name
        self.input_size: Tuple[int, int] = (112, 112)

    def _preprocess(self, aligned_face: np.ndarray) -> np.ndarray:
        img_rgb: np.ndarray = cv2.cvtColor(aligned_face, cv2.COLOR_BGR2RGB)
        
        blob: np.ndarray = (img_rgb.astype(np.float32) - 127.5) / 127.5
        
        blob = np.transpose(blob, (2, 0, 1))
        blob = np.expand_dims(blob, axis=0)
        
        return blob

    def recognize(self, aligned_face: np.ndarray) -> np.ndarray:
        blob: np.ndarray = self._preprocess(aligned_face)
        
        outputs: List[np.ndarray] = self.session.run([self.output_name], {self.input_name: blob})
        embedding: np.ndarray = outputs[0][0]
        
        embedding_norm: np.ndarray = embedding / np.linalg.norm(embedding)
        
        return embedding_norm