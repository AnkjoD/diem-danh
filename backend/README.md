# Homura Attendance - Backend

Hệ thống API xử lý logic nghiệp vụ cho Attendance System, được xây dựng bằng NestJS.

## 🛠 Công nghệ
- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) với [TypeORM](https://typeorm.io/)
- **Authentication**: JWT (Passport)
- **Storage**: MinIO SDK
- **Validation**: class-validator & class-transformer

## 🚀 Hướng dẫn cài đặt

### 1. Cấu hình môi trường (.env)
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

Các biến môi trường:
- **Database (PostgreSQL)**:
    - `DB_HOST`: Địa chỉ Database (`localhost` nếu chạy ngoài Docker, `postgres` nếu dùng compose).
    - `DB_PORT`: Cổng DB (mặc định `5432`).
    - `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`: Thông tin xác thực và tên DB.
- **MinIO Storage**:
    - `MINIO_ENDPOINT`: Địa chỉ MinIO (`127.0.0.1` hoặc `minio`).
    - `MINIO_PORT`: Cổng API của MinIO (`9000`).
    - `MINIO_USE_SSL`: Sử dụng SSL/HTTPS (mặc định `false`).
    - `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`: Thông tin đăng nhập MinIO.
    - `MINIO_BUCKET_NAME`: Tên bucket lưu trữ hình ảnh (ví dụ: `attendance-logs`).
- **AI Core Integration**:
    - `AI_SERVICE_URL`: URL gọi đến AI microservice (`http://localhost:8000` hoặc `http://ai:8000`).
- **Security**:
    - `JWT_SECRET`: Chuỗi khóa bí mật dùng để Tokenize phiên đăng nhập.

### 2. Cài đặt và Chạy (Local)
Yêu cầu: Node.js >= 18.

```bash
# Cài đặt thư viện
npm install

# Chạy ở chế độ Development (Watch mode)
npm run start:dev

# Chạy ở chế độ Production
npm run build
npm run start:prod
```

### 3. Chạy bằng Docker
Nếu bạn chạy từ thư mục gốc của dự án:
```bash
docker-compose up -d backend
```

## 📂 Cấu trúc thư mục
- `src/attendance`: Xử lý logic điểm danh và đối soát khuôn mặt.
- `src/student`: Quản lý thông tin học sinh và Dataset ảnh.
- `src/session`: Quản lý các phiên điểm danh.
- `src/auth`: Xử lý đăng nhập và phân quyền.
- `src/common`: Các interceptors, filters, và utilities dùng chung.

## 📝 API Documentation
Sau khi chạy server, bạn có thể truy cập Swagger UI (nếu được cấu hình) tại:
`http://localhost:4000/api` (Tùy thuộc vào cấu hình trong `main.ts`).
