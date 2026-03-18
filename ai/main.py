import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from src.detector import FaceDetector
from src.aligner import FaceAligner
from src.recognizer import FaceRecognizer
from src.matcher import FaceMatcher
import os
app = FastAPI(title="Face Attendance AI Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# INIT MODELS
detector = FaceDetector(model_path="./models/scrfd.onnx")
detector.prepare(ctx_id=-1, nms_thresh=0.4)
aligner = FaceAligner()
recognizer = FaceRecognizer(model_path="./models/webface_r50_pfc.onnx")
matcher = FaceMatcher(dimension=512)

class RecognizeResponse(BaseModel):
    status: str
    student_id: Optional[str] = None
    distance: Optional[float] = None
    message: str

class RegisterResponse(BaseModel):
    status: str
    message: str

async def process_upload(file: UploadFile) -> np.ndarray:
    image_bytes = await file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
  
    return img

def get_face_vector(image: np.ndarray) -> Optional[np.ndarray]:
    bboxes, landmarks = detector.detect(image, thresh=0.5, input_size=(640, 640))
    if bboxes is None or bboxes.shape[0] == 0 or landmarks is None:
        return None

    max_area_idx = np.argmax((bboxes[:, 2] - bboxes[:, 0]) * (bboxes[:, 3] - bboxes[:, 1]))
    aligned_face = aligner.align(image, landmarks[max_area_idx])
   
    return recognizer.recognize(aligned_face)

@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(file: UploadFile = File(...)):
    img = await process_upload(file)
    embedding = get_face_vector(img)
    
    if embedding is None:
        return RecognizeResponse(status="failed", message="No face detected")
        
    student_id, distance = matcher.search_face(embedding, threshold=1.2)
    
    if student_id:
        return RecognizeResponse(
            status="success", 
            student_id=student_id, 
            distance=float(distance), 
            message="Match"
        )
    return RecognizeResponse(status="unknown", message="Face not found in DB")

@app.post("/register", response_model=RegisterResponse)
async def register(student_id: str = Form(...), file: UploadFile = File(...)):
    img = await process_upload(file)
    embedding = get_face_vector(img)
    
    if embedding is None:
        raise HTTPException(status_code=400, detail="No face detected")
        
    matcher.add_face(embedding, student_id)
    return RegisterResponse(status="success", message=f"Registered {student_id}")

# Thêm cái này vào cùng chỗ với các API /recognize và /register
@app.delete("/delete/{student_id}")
async def delete_student_face(student_id: str):
    success = matcher.delete_face(student_id)
    
    if success:
        return {"status": "success", "message": f"Đã xóa hoàn toàn khuôn mặt của {student_id} khỏi FAISS."}
    else:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên này trong bộ nhớ AI.")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)   