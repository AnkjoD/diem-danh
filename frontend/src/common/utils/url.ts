/**
 * Sửa các URL từ localhost/127.0.0.1 thành IP LAN thực tế của server
 * để điện thoại có thể tải được ảnh từ MinIO.
 */
export const fixLocalUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    
    // Nếu đang truy cập qua IP LAN (không phải localhost)
    if (hostname !== "localhost" && hostname !== "127.0.0.1" && /^[0-9.]+$/.test(hostname)) {
      // Thay thế localhost hoặc 127.0.0.1 bằng IP hiện tại của Dashboard
      return url.replace(/localhost|127\.0\.0\.1/, hostname);
    }
  }
  
  return url;
};
