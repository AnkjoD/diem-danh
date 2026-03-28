# Homura Attendance - Frontend

Giao diện người dùng cho hệ thống điểm danh nhận diện khuôn mặt, được xây dựng bằng Next.js 14+.

## 🛠 Công nghệ
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI Components**: [Material UI (MUI)](https://mui.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Icons**: [Material Icons](https://mui.com/material-ui/material-icons/)

## 🚀 Hướng dẫn cài đặt

### 1. Cấu hình môi trường (.env)
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```
Cấu hình biến sau:
- `NEXT_PUBLIC_SERVER_URL`: URL của Backend API (Mặc định: `http://localhost:4000`).

### 2. Cài đặt và Chạy (Local)
Yêu cầu: Node.js >= 18.

```bash
# Cài đặt thư viện
npm install

# Chạy ở chế độ Development
npm run dev
```
Truy cập tại: [http://localhost:3000](http://localhost:3000)

### 3. Chạy bằng Docker
Nếu bạn chạy từ thư mục gốc của dự án:
```bash
docker-compose up -d frontend
```

## 📂 Cấu trúc thư mục
- `src/app`: Các trang và layout chính (Routing).
- `src/components`: Các UI component dùng chung.
- `src/hooks`: Các custom React hooks và API calls (Query).
- `src/theme`: Cấu hình giao diện (Material UI Theme).
- `public`: Chứa các tài nguyên tĩnh như ảnh, logo.

## 🔑 Lưu ý quan trọng
- Đảm bảo Backend API đang chạy trước khi thao tác trên Frontend.
- Biến môi trường bắt đầu bằng `NEXT_PUBLIC_` sẽ được công khai ở phía Client.
