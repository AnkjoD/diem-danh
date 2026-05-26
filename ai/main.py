import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal

from src.detector import FaceDetector
from src.aligner import FaceAligner
from src.recognizer import FaceRecognizer
from src.matcher import FaceMatcher
import os
import tempfile
app = FastAPI(title="Face Attendance AI Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# INIT MODELS
detector = FaceDetector(model_path="./models/detector.onnx")
detector.prepare(ctx_id=-1, nms_thresh=0.4)
aligner = FaceAligner()
recognizer = FaceRecognizer(model_path="./models/recognizer.onnx")
matcher = FaceMatcher(dimension=512)

class RecognizeResponse(BaseModel):
    status: str
    student_ids: list[str] = []
    bboxes: list[list[float]] = [] # x1, y1, x2, y2
    distances: list[float] = []
    message: str

class RegisterResponse(BaseModel):
    status: str
    message: str
    embedding: Optional[list[float]] = None

async def process_upload(file: UploadFile) -> np.ndarray:
    image_bytes = await file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image")
  
    return img




def get_face_data(image: np.ndarray, mode: Literal["register", "recognize"] = "recognize"):
    h_orig, w_orig = image.shape[:2]
    print(f"[get_face_data] mode={mode}, original_size={w_orig}x{h_orig}")

    # Threshold for detection (0.5 giống b5fe7fb - đây là giá trị đã kiểm chứng tốt nhất)
    thresh = 0.5
    # Input size cố định (640, 640) giống b5fe7fb - detector có letterbox nên không bị méo
    input_size = (640, 640)
    print(f"[get_face_data] input_size: {input_size}")

    detection_result = detector.detect(image, thresh=thresh, input_size=input_size)

    def _is_valid_det(res):
        return isinstance(res, (tuple, list)) and len(res) >= 2 and res[0] is not None and res[0].shape[0] > 0

    if not _is_valid_det(detection_result):
        print("[get_face_data] No face detected with default settings. Entering fallback mode...")
        # Fallback 1: Giảm ngưỡng nhận diện (phòng ảnh có khuôn mặt nhỏ hoặc nghiêng)
        detection_result = detector.detect(image, thresh=0.2, input_size=(640, 640))

        # Fallback 2: Thử với ảnh size nhỏ hơn (320x320) - phòng mặt quá to vượt receptive field
        if not _is_valid_det(detection_result):
            print(f"[get_face_data] Lower threshold failed. Trying 320x320...")
            detection_result = detector.detect(image, thresh=0.2, input_size=(320, 320))

        # Fallback 3 & 4: Xoay ảnh (phòng EXIF xoay ngang)
        if not _is_valid_det(detection_result):
            print(f"[get_face_data] Size reduction failed. Trying to rotate 90 degrees CW...")
            image_rot90 = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
            detection_result = detector.detect(image_rot90, thresh=0.2, input_size=(640, 640))
            if _is_valid_det(detection_result):
                image = image_rot90
            else:
                print(f"[get_face_data] Trying to rotate 90 degrees CCW...")
                image_rot270 = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
                detection_result = detector.detect(image_rot270, thresh=0.2, input_size=(640, 640))
                if _is_valid_det(detection_result):
                    image = image_rot270
                else:
                    print("[get_face_data] No faces detected even after ALL fallbacks.")
                    return None

    det, landmarks = detection_result[0], detection_result[1]

    print(f"[get_face_data] Detected {det.shape[0]} face(s)")

    if mode == "recognize":
        results = []
        for i in range(len(landmarks)):
            bbox = det[i, 0:4].tolist()
            aligned_face = aligner.align(image, landmarks[i])
            embedding = recognizer.recognize(aligned_face)
            results.append({"embedding": embedding, "bbox": bbox})
        return results
    else:
        # For registration, pick the largest face
        bboxes = det[:, 0:4]
        areas = (bboxes[:, 2] - bboxes[:, 0]) * (bboxes[:, 3] - bboxes[:, 1])
        max_area_idx = np.argmax(areas)
        aligned_face = aligner.align(image, landmarks[max_area_idx])
        embedding = recognizer.recognize(aligned_face)
        bbox = bboxes[max_area_idx].tolist()
        return {"embedding": embedding, "bbox": bbox}

@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(file: UploadFile = File(...)):
    print(f"[/recognize] Received file: {file.filename}, size hint: {file.size}")
    img = await process_upload(file)
    results = get_face_data(img, "recognize")
    
    if results is None or len(results) == 0:
        print(f"[/recognize] No faces detected -> returning failed")
        return RecognizeResponse(status="failed", message="No face detected")
    
    print(f"[/recognize] {len(results)} face(s) detected, running FAISS match (DB size: {matcher.index.ntotal})...")
    student_ids = []
    bboxes = []
    distances = []
    for i, res in enumerate(results):
        student_id, distance = matcher.search_face(res["embedding"], threshold=1.0)
        print(f"[/recognize] Face #{i+1}: matched={student_id}, distance={distance:.4f}")
        if student_id and distance:
            student_ids.append(student_id)
            bboxes.append(res["bbox"])
            distances.append(float(distance))
    
    if len(student_ids) > 0:
        return RecognizeResponse(
            status="success", 
            student_ids=student_ids, 
            bboxes=bboxes,
            distances=distances, 
            message="Match"
        )
    return RecognizeResponse(status="failed", message="No faces recognized from the database")

@app.post("/recognize-video", response_model=RecognizeResponse)
async def recognize_video(file: UploadFile = File(...), fps: float = Form(1.0)):
    print(f"[/recognize-video] Received video: {file.filename}, requested {fps} fps")
    
    # Save uploaded video to a temporary file
    temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    try:
        content = await file.read()
        temp_video.write(content)
        temp_video.flush()
        
        # Check size limit (e.g. 200MB)
        if len(content) > 200 * 1024 * 1024:
            return RecognizeResponse(status="failed", message="Video file too large (max 200MB)")

        cap = cv2.VideoCapture(temp_video.name)
        if not cap.isOpened():
            return RecognizeResponse(status="failed", message="Failed to process video file")

        video_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if video_fps <= 0 or total_frames <= 0:
            return RecognizeResponse(status="failed", message="Invalid video file format")
            
        video_duration = total_frames / video_fps
        print(f"[/recognize-video] Video duration: {video_duration:.2f}s, original FPS: {video_fps}")
        
        # Determine how many frames to skip to achieve the requested `fps`
        if fps <= 0: fps = 1.0
        frame_interval = int(video_fps / fps)
        if frame_interval < 1: frame_interval = 1

        unique_student_ids = set()
        
        frame_count = 0
        processed_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Smart sampling: process only 1 frame every `frame_interval` frames
            if frame_count % frame_interval == 0:
                results = get_face_data(frame, "recognize")
                if results and len(results) > 0:
                    for res in results:
                        student_id, distance = matcher.search_face(res["embedding"], threshold=1.2)
                        if student_id and distance:
                            unique_student_ids.add(student_id)
                processed_count += 1
                
            frame_count += 1

        cap.release()
        print(f"[/recognize-video] Extracted and processed {processed_count} frames. Found {len(unique_student_ids)} students.")
        
        if len(unique_student_ids) > 0:
            return RecognizeResponse(
                status="success", 
                student_ids=list(unique_student_ids),
                bboxes=[], 
                distances=[], 
                message=f"Recognized {len(unique_student_ids)} students from video"
            )
        else:
            return RecognizeResponse(status="failed", message="No faces recognized from the video")
            
    finally:
        temp_video.close()
        os.unlink(temp_video.name)

@app.post("/register", response_model=RegisterResponse)
async def register(student_id: str = Form(...), file: UploadFile = File(...)):
    img = await process_upload(file)
    result = get_face_data(img, "register")
    
    if result is None:
        raise HTTPException(status_code=400, detail="No face detected")
        
    embedding = result["embedding"]
    matcher.add_face(embedding, student_id)
    return RegisterResponse(status="success", message=f"Registered {student_id}", embedding=embedding.tolist())

# Thêm cái này vào cùng chỗ với các API /recognize và /register
@app.get("/students")
async def get_registered_students():
    return {"student_ids": matcher.id_mapping}

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