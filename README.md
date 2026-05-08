<div align="center">
  <img src="https://img.shields.io/badge/Homura-Smart_Attendance-8A2BE2?style=for-the-badge&logo=react" alt="Homura Logo" />
  <h1>Homura - Smart Facial Recognition Attendance System</h1>
  <p>Hệ thống điểm danh sinh trắc học thông minh dành cho giáo dục, tối ưu hóa quy trình điểm danh bằng AI.</p>
</div>

---

## 🌟 Tính Năng Nổi Bật (Key Features)

- **🤖 Điểm danh bằng AI:** Tự động nhận diện khuôn mặt học sinh/sinh viên qua Camera (Webcam) hoặc ảnh tải lên hàng loạt (Bulk Upload).
- **📱 Hỗ trợ quét mã QR (Mobile-ready):** Sinh viên có thể dùng điện thoại quét mã QR từ màn hình giáo viên để tự điểm danh qua mạng nội bộ.
- **⚡ Xử lý hàng đợi hiệu năng cao:** Kiến trúc Backend chịu tải tốt, điểm danh hàng nghìn sinh viên cùng lúc mà không lo nghẽn mạng nhờ cơ chế Queue & Batching.
- **📊 Giao diện quản lý hiện đại:** Bảng điều khiển (Dashboard) trực quan giúp giáo viên dễ dàng gán sinh viên, quản lý môn học, lớp học và theo dõi lịch sử điểm danh.
- **🔒 Bảo mật tuyệt đối:** Tự động sinh `JWT Secret` ngẫu nhiên cho từng thiết lập, đảm bảo an toàn dữ liệu nội bộ.

---

## 🏗 Kiến Trúc Hệ Thống (Architecture)

Dự án được xây dựng dựa trên mô hình **Client-Server** hiện đại, kết hợp với các dịch vụ bổ trợ chạy hoàn toàn trên Docker:

*   **Frontend:** `Next.js 14`, `React`, `Material UI (MUI)` - Mang lại giao diện mượt mà, Dark Mode chuyên nghiệp.
*   **Backend:** `NestJS`, `TypeORM`, `TypeScript` - Kiến trúc Module chặt chẽ, dễ mở rộng, xử lý logic và Socket.io cho Real-time.
*   **AI Engine:** Tích hợp `face-api.js` xử lý trực tiếp trên nền tảng Node.js (Backend) giúp loại bỏ độ trễ giao tiếp so với các kiến trúc Microservices truyền thống.
*   **Database:** `PostgreSQL` - Lưu trữ dữ liệu cấu trúc an toàn.
*   **Storage:** `MinIO` (S3 Compatible) - Lưu trữ và quản lý hình ảnh Dataset.
*   **Infrastructure:** Đóng gói toàn bộ bằng `Docker` & `Docker Compose`.

---

## 🚀 Hướng Dẫn Cài Đặt (One-Click Setup)

Để sử dụng phần mềm, bạn **không cần** phải biết lập trình hay cấu hình phức tạp. Hệ thống đã được tích hợp bộ công cụ cài đặt tự động (Interactive Installer).

### Yêu cầu tiên quyết:
1. Máy tính đã cài đặt **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Phải bật Docker chạy ngầm).
2. Hệ điều hành: Windows, macOS hoặc Linux.

### Các bước cài đặt:
1. **Tải mã nguồn:** Clone repository này về máy.
2. **Khởi động trình cài đặt:** 
   - Click đúp vào file **`start-homura.bat`** (trên Windows).
3. **Cấu hình tự động:**
   - Ở lần chạy đầu tiên, màn hình Terminal sẽ hiển thị. Trình cài đặt sẽ hỏi bạn muốn đặt **Tên đăng nhập** và **Mật khẩu** cho Database là gì. Hệ thống sẽ tự động tạo file `.env` và mã hóa bảo mật (Random JWT).
   - Hệ thống cũng tự động tạo một file **`.env.backup`**. Nếu lỡ tay xóa mất cấu hình, lần sau chạy file bat, nó sẽ tự động lấy bản backup ra để khôi phục!
   - Hệ thống sẽ **tự động tải AI Models** cần thiết về máy.
4. **Sử dụng hàng ngày:**
   - Sau khi Docker tải xong các vùng chứa, trình duyệt sẽ tự động mở trang web: `http://localhost:3000`.
   - Lần sau muốn dùng lại, bạn chỉ cần bấm `start-homura.bat` là xong.

### Phân biệt các công cụ (Scripts):
- 🟢 **`start-homura.bat`**: Nhấn để bật ứng dụng hàng ngày. Tích hợp sẵn Installer tự động khôi phục dữ liệu nếu bị lỗi cấu hình.
- 🟡 **`update-homura.bat`**: CHỈ nhấn khi ứng dụng bị lỗi, chạy không lên, hoặc khi bạn vừa kéo bản cập nhật code mới từ Github về. File này sẽ ép hệ thống dọn dẹp và đóng gói lại toàn bộ từ đầu.

> **⚠️ LƯU Ý CHO NGƯỜI PHÁT TRIỂN (DEVELOPERS):** 
> Mặc định file setup sẽ tự tải thư mục Models từ liên kết Dropbox do tác giả cung cấp. Nếu bạn muốn thay thế link tải Model của riêng bạn, hãy nén thư mục `models` thành định dạng **`.zip`** (KHÔNG DÙNG `.rar`) để lệnh tự giải nén của Windows Powershell trong file `start-homura.bat` hoạt động bình thường.

---

## 👨‍💻 Dành Cho Nhà Phát Triển (For Developers)

### Cấu trúc thư mục:
```text
diem-danh/
├── frontend/          # Mã nguồn React/Next.js
├── backend/           # Mã nguồn NestJS API & AI Logic
│   ├── src/           # Modules (Attendance, Session, Student...)
│   └── models/        # Chứa file weights của AI (được tải tự động)
├── docker-compose.prod.yml  # File cấu hình môi trường Production
├── start-homura.bat   # Script tự động cài đặt & chạy app
└── update-homura.bat  # Script dọn cache & cập nhật bản build mới
```

### Triển khai Môi trường Phát triển (Dev Mode):
1. Cài đặt `Node.js` (Khuyên dùng v20+).
2. Tách riêng 2 terminal:
   - **Frontend:** Chạy `npm install` và `npm run dev` trong thư mục `frontend`.
   - **Backend:** Chạy `npm install` và `npm run start:dev` trong thư mục `backend`.

---

<p align="center">
  <i>Hệ thống được phát triển với trọng tâm là hiệu năng và trải nghiệm người dùng.</i>
</p>

