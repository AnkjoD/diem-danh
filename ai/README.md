# Homura Attendance - AI Core

Microservice xử lý nhận diện khuôn mặt chuyên sâu, được xây dựng bằng Python và FastAPI.

## 🛠 Công nghệ
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Face Detection & Recognition**: [InsightFace](https://github.com/deepinsight/insightface) (SCRFD & WebFace600M)
- **Vector Search**: [FAISS](https://github.com/facebookresearch/faiss) hoặc lưu trữ Vector nhị phân qua Numpy.
- **Image Processing**: OpenCV & PIL.

## 🚀 Hướng dẫn cài đặt

### 1. Chuẩn bị Models
Bạn cần tải các pretrained model của InsightFace (buffalo_l hoặc các model tương tự) và đặt vào thư mục `models/`. 
Có thể sử dụng script tải tự động ở thư mục gốc:
```bash
python ../scripts/download_models.py
```

### 2. Cài đặt và Chạy (Local)
Yêu cầu: Python 3.10+.

```bash
# Tạo môi trường ảo
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows

# Cài đặt thư viện
pip install -r requirements.txt

# Chạy server
python main.py
```
Mặc định chạy tại: `http://localhost:8000`

### 3. Chạy bằng Docker
AI Service được cấu hình để chạy tối ưu trong Docker:
```bash
docker build -t homura-ai .
docker run -p 8000:8000 homura-ai
```

## 🧠 Cơ chế hoạt động
1. **Extraction**: Khi thêm học sinh mới, AI sẽ trích xuất 512 đặc điểm khuôn mặt (Embedding) và gửi về Backend lưu vào Database.
2. **Matching**: Khi điểm danh, AI so sánh Embedding của khuôn mặt mới với toàn bộ Dataset hiện có để tìm ra danh tính có độ tương đồng cao nhất.
3. **Threshold**: Sử dụng ngưỡng Cosine Similarity để quyết định kết quả là "Chính xác" hay "Người lạ".

## 📂 Cấu trúc thư mục
- `main.py`: Entry point của FastAPI server.
- `src/`: Chứa logic xử lý ảnh và trích xuất vector.
- `models/`: Chứa các file trọng số của mô hình Deep Learning.
- `databases/`: Chứa index vector tạm thời (nếu có).
