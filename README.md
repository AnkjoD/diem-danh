# Hệ Thống Điểm Danh Khuôn Mặt (Homura Attendance)

Hệ thống điểm danh học sinh thông qua nhận diện khuôn mặt sử dụng AI (Deep Learning), tích hợp live webcam và tải ảnh tĩnh.

## 🚀 Tính năng chính
- **Quản lý học sinh**: Thêm, xóa, sửa, và nhập liệu hàng loạt (Bulk Import) học sinh.
- **Đăng ký khuôn mặt**: Chụp ảnh trực tiếp từ Webcam để trích xuất Vector đặc trưng (512D) lưu vào DB.
- **Điểm danh AI**: 
    - Chụp ảnh snapshot từ Webcam hoặc tải ảnh file (JPG/PNG).
    - AI tự động nhận diện, đối soát với cơ sở dữ liệu và đánh dấu "Có mặt" ngay lập tức.
- **Quản lý lớp học**: Tổ chức học sinh theo lớp và môn học.
- **Báo cáo**: Theo dõi trạng thái điểm danh thời gian thực.

## 🛠 Công nghệ sử dụng
- **Frontend**: Next.js 14, React, Material UI (MUI), TanStack Query.
- **Backend**: NestJS, TypeORM, PostgreSQL.
- **AI Core**: Python (FastAPI), OpenCV, FAISS (Vector Database), InsightFace (SCRFD & WebFace).
- **Storage**: MinIO (S3 Compatible) để lưu trữ hình ảnh Dataset.
- **DevOps**: Docker, Docker Compose.

## 📦 Hướng dẫn cài đặt (Docker)

### 1. Chuẩn bị môi trường
- Cài đặt **Docker Desktop** và **Docker Compose**.
- Tạo file `.env` từ file mẫu:
  ```bash
  cp .env.example .env
  ```
- Mở file `.env` và cấu hình các thông số sau:
    - **Database Config**:
        - `DB_USERNAME`: Tên người dùng quản trị PostgreSQL.
        - `DB_PASSWORD`: Mật khẩu cho PostgreSQL.
        - `DB_DATABASE`: Tên cơ sở dữ liệu (`attendance_db`).
        - `DB_PORT`: Cổng kết nối (mặc định `5432`).
    - **MinIO Storage**:
        - `MINIO_ROOT_USER`: Tên đăng nhập quản trị MinIO.
        - `MINIO_ROOT_PASSWORD`: Mật khẩu quản trị MinIO.
    - **pgAdmin Access**:
        - `PGADMIN_DEFAULT_EMAIL`: Email đăng nhập vào giao diện quản lý pgAdmin.
        - `PGADMIN_DEFAULT_PASSWORD`: Mật khẩu đăng nhập pgAdmin.
    - **Service URLs**:
        - `FASTAPI_URL`: URL nội bộ cho backend gọi AI Core (mặc định `http://ai:8000`).
        - `SERVER_URL`: URL chính thức của Backend (mặc định `http://localhost:4000`).
    - **Security**:
        - `JWT_SECRET`: Một chuỗi ngẫu nhiên dài để bảo mật Token (Ví dụ: `openssl rand -base64 32`).

### 2. Khởi chạy hệ thống
Tải các Model AI cần thiết (chỉ cần thực hiện lần đầu):
```bash
python scripts/download_models.py
```
*Lưu ý: Bạn cần cài đặt Python và thư viện `requests` để chạy script này.*

Khởi chạy Docker:
```bash
docker-compose up -d --build
```

### 3. Truy cập ứng dụng
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **AI Service**: [http://localhost:8000](http://localhost:8000)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (Đăng nhập bằng `MINIO_ROOT_USER` và `MINIO_ROOT_PASSWORD` trong `.env`)
- **pgAdmin**: [http://localhost:5050](http://localhost:5050) (Đăng nhập bằng `PGADMIN_DEFAULT_EMAIL` và `PGADMIN_DEFAULT_PASSWORD`)

## 🔐 Bảo mật & Lưu ý
- Thay đổi `JWT_SECRET` trong file `.env` trước khi deploy.
- Không chia sẻ file `ai/databases/db.bin` vì đây là nơi chứa dữ liệu Vector nhạy cảm.
- Khi chạy lần đầu, AI Service sẽ mất vài phút để tải/khởi tạo Model.

## 📂 Cấu trúc thư mục
- `/frontend`: Mã nguồn React/Next.js.
- `/backend`: API server NestJS.
- `/ai`: Microservice xử lý nhận diện khuôn mặt (Python).
- `/docker-compose.yml`: Cấu hình orchestration toàn bộ hệ thống.
