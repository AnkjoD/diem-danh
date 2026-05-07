import cv2
import numpy as np
import os
import torch
import torch.nn.functional as F
from gfpgan import GFPGANer


class FaceEnhancer:
    """
    Pipeline enhance khuôn mặt cho ảnh toàn cảnh lớp học.
    Dùng GFPGANv1.3 — giữ identity tốt hơn v1.2 (không beauty makeup).
    Kết hợp TTA để tăng độ ổn định embedding.

    Lý do chọn v1.3:
        - Không có beauty makeup -> không làm thay đổi đặc trưng khuôn mặt
        - Tốt với ảnh chất lượng thấp (ảnh lớp học chụp xa)
        - Identity thay đổi ít hơn v1.2 -> cosine similarity ổn định hơn
        - Hỗ trợ restore 2 lần liên tiếp nếu ảnh quá tệ
    """

    # Tự động download lần đầu, không cần tải thủ công
    GFPGAN_V13_URL = (
        "https://github.com/TencentARC/GFPGAN/releases/download/"
        "v1.3.0/GFPGANv1.3.pth"
    )

    def __init__(
        self,
        small_face_threshold: int = 80,  # px — nhỏ hơn ngưỡng này mới chạy GFPGAN
        upscale_factor: int = 2,         # x2 đủ cho face recognition, nhanh hơn x4
        double_restore: bool = False,    # restore 2 lần nếu ảnh quá tệ (v1.3 hỗ trợ)
        use_gfpgan: bool = True,         # tắt nếu CPU yếu -> Lanczos fallback
        use_tta: bool = True,
        use_clahe: bool = True,
        device: str = None,
        model_path: str = "models/GFPGANv1.3.pth",
    ):
        self.small_face_threshold = small_face_threshold
        self.upscale_factor = upscale_factor
        self.double_restore = double_restore
        self.use_gfpgan = use_gfpgan
        self.use_tta = use_tta
        self.use_clahe = use_clahe
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        print(f"[FaceEnhancer] Device        : {self.device}")
        print(f"[FaceEnhancer] GFPGAN v1.3   : {use_gfpgan}")
        print(f"[FaceEnhancer] Double restore: {double_restore}")
        print(f"[FaceEnhancer] TTA           : {use_tta}")

        # ── Load GFPGANv1.3 ──────────────────────────────────────────────────
        if self.use_gfpgan:
            # Kiểm tra và tải model nếu chưa có trong thư mục models/
            if not os.path.exists(model_path):
                print(f"[FaceEnhancer] Model khong tim thay tai {model_path}. Dang tai ve...")
                os.makedirs(os.path.dirname(model_path), exist_ok=True)
                torch.hub.download_url_to_file(self.GFPGAN_V13_URL, model_path)
            
            self.gfpgan = GFPGANer(
                model_path=model_path,
                upscale=upscale_factor,
                arch="clean",
                channel_multiplier=2,
                bg_upsampler=None, 
                device=self.device,
            )
            print(f"[FaceEnhancer] GFPGANv1.3 ready from {model_path}!")
        else:
            self.gfpgan = None
            print("[FaceEnhancer] GFPGAN tat -> Lanczos fallback")

        # ── TTA transforms ────────────────────────────────────────────────────
        # Chi dung transform an toan, khong lam thay doi identity
        # Khong rotate vi SCRFD da alignment roi
        self.tta_transforms = [
            lambda img: img,                                  # goc
            lambda img: cv2.flip(img, 1),                    # flip ngang
            lambda img: self._adjust_brightness(img, 1.15), # sang hon nhe
            lambda img: self._adjust_brightness(img, 0.85), # toi hon nhe
            lambda img: self._adjust_contrast(img, 1.15),   # contrast nhe
        ]

    # ─────────────────────────────────────────────────────────────────────────
    # PUBLIC
    # ─────────────────────────────────────────────────────────────────────────

    def process(self, face_img: np.ndarray, bbox: np.ndarray = None, return_image: bool = False) -> list:
        """
        Nhan anh khuon mat da crop tu SCRFD (BGR, bat ky size).
        Tra ve list anh:
            - data (list[blob float32]) neu return_image=False (Default)
            - data (list[BGR uint8])   neu return_image=True

        Args:
            face_img: Anh mat (da align hoac crop)
            bbox:     Bounding box goc [x1, y1, x2, y2] tu detector (optional)
            return_image: Neu True, tra ve list anh BGR uint8 de dung cho Align buoc sau.

        use_tta=True  -> 5 variants
        use_tta=False -> 1 variant
        """
        # Buoc 1: CLAHE — can bang sang toi per-face
        if self.use_clahe:
            face_img = self._apply_clahe(face_img)

        # Buoc 2: GFPGAN neu khuon mat nho (check theo size goc)
        if bbox is not None:
            w_orig = bbox[2] - bbox[0]
            h_orig = bbox[3] - bbox[1]
            face_size = min(w_orig, h_orig)
        else:
            face_size = min(face_img.shape[:2])

        if face_size < self.small_face_threshold:
            print(f"[FaceEnhancer] {int(face_size)}px < {self.small_face_threshold}px -> GFPGAN v1.3")
            face_img = self._restore(face_img)
            if self.double_restore:
                print("[FaceEnhancer] Double restore lan 2...")
                face_img = self._restore(face_img)
        else:
            print(f"[FaceEnhancer] {int(face_size)}px du lon -> bo qua GFPGAN")

        # Buoc 3: TTA — tao cac bien the
        variants = (
            [t(face_img) for t in self.tta_transforms]
            if self.use_tta
            else [face_img]
        )

        # Buoc 4: output
        if return_image:
            return variants
        return [self._to_arcface_input(v) for v in variants]

    # ─────────────────────────────────────────────────────────────────────────
    # PRIVATE
    # ─────────────────────────────────────────────────────────────────────────

    def _restore(self, img: np.ndarray) -> np.ndarray:
        """GFPGANv1.3 restore. Fallback Lanczos neu loi."""
        if self.gfpgan is None:
            return self._lanczos_upscale(img)
        try:
            _, _, output = self.gfpgan.enhance(
                img,
                has_aligned=False,      # chua align, GFPGAN tu detect landmark
                only_center_face=True,  # chi xu ly mat trung tam
                paste_back=True,
            )
            return output if output is not None else self._lanczos_upscale(img)
        except Exception as e:
            print(f"[FaceEnhancer] GFPGAN loi: {e} -> Lanczos fallback")
            return self._lanczos_upscale(img)

    def _lanczos_upscale(self, img: np.ndarray) -> np.ndarray:
        """Fallback nhe: Lanczos khong lam meo dac trung khuon mat."""
        h, w = img.shape[:2]
        return cv2.resize(
            img,
            (w * self.upscale_factor, h * self.upscale_factor),
            interpolation=cv2.INTER_LANCZOS4,
        )

    def _apply_clahe(self, img: np.ndarray) -> np.ndarray:
        """
        CLAHE tren kenh L cua LAB color space.
        Dieu chinh sang toi cuc bo — hieu qua voi lop hoc
        co nguon sang khong dong deu (cua so, den tran...).
        """
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
        l = clahe.apply(l)
        return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

    def _to_arcface_input(self, img: np.ndarray) -> np.ndarray:
        """
        Resize 112x112, normalize [-1,1], BGR->RGB, HWC->CHW.
        Output: (3, 112, 112) float32
        """
        resized = cv2.resize(img, (112, 112), interpolation=cv2.INTER_LANCZOS4)
        norm = (resized.astype(np.float32) - 127.5) / 127.5
        return np.ascontiguousarray(norm[:, :, ::-1].transpose(2, 0, 1))

    @staticmethod
    def _adjust_brightness(img: np.ndarray, factor: float) -> np.ndarray:
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 2] = np.clip(hsv[:, :, 2] * factor, 0, 255)
        return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    @staticmethod
    def _adjust_contrast(img: np.ndarray, factor: float) -> np.ndarray:
        mean = np.mean(img)
        return np.clip(
            (img.astype(np.float32) - mean) * factor + mean, 0, 255
        ).astype(np.uint8)


# ─────────────────────────────────────────────────────────────────────────────
# Helper tich hop vao pipeline diem danh
# ─────────────────────────────────────────────────────────────────────────────

def get_embedding_with_tta(face_crop, enhancer, recognizer, aligner=None, landmarks=None, bbox: np.ndarray = None):
    """
    face_crop -> enhance + (optionally Align) + TTA -> average embedding (512,).

    Args:
        face_crop:    BGR numpy array, khuon mat da crop tu SCRFD
        enhancer:     FaceEnhancer instance
        recognizer:   FaceRecognizer instance (ONNX)
        aligner:      FaceAligner instance (Optional)
        landmarks:    5 diem landmarks tu detector (Optional)
        bbox:         Bounding box goc tu detector

    Returns:
        np.ndarray (512,) da normalize L2
    """
    # 1. Enhance & TTA (tra ve list cac BGR variants neu chung ta can Align sau do)
    # Neu co aligner, ta lay anh BGR de Align cho dung chuan
    use_manual_align = (aligner is not None and landmarks is not None)
    
    variants = enhancer.process(face_crop, bbox=bbox, return_image=use_manual_align)             
    
    embeddings = []
    for v in variants:
        if use_manual_align:
            # B1: Align tung variant bằng landmarks gốc
            # Luu y: landmarks phai duoc tinh toan lai neu bi shift (tam thoi dung lmk goc)
            aligned_v = aligner.align(face_crop if v is face_crop else v, landmarks)
            # B2: Recognize
            emb = recognizer.recognize(aligned_v)
        else:
            # Truong hop khong dung Align ben ngoai (dung fallback resize cua enhancer)
            emb = recognizer.recognize(v)
            
        embeddings.append(emb)

    # 2. Average embeddings
    avg_embedding = np.mean(embeddings, axis=0)
    
    # 3. Final Normalize
    norm = np.linalg.norm(avg_embedding)
    if norm > 0:
        avg_embedding = avg_embedding / norm
        
    return avg_embedding


# ─────────────────────────────────────────────────────────────────────────────
# Demo
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    has_gpu = torch.cuda.is_available()
    print(f"GPU: {has_gpu}")

    enhancer = FaceEnhancer(
        small_face_threshold=80,
        upscale_factor=2,
        double_restore=False,  # bat neu anh qua te
        use_gfpgan=has_gpu,    # CPU -> Lanczos, GPU -> GFPGANv1.3
        use_tta=True,
    )

    path = sys.argv[1] if len(sys.argv) > 1 else "test_face.jpg"
    face = cv2.imread(path)
    if face is None:
        print(f"Khong doc duoc: {path}")
        sys.exit(1)

    print(f"Input: {face.shape}")
    variants = enhancer.process(face)
    print(f"TTA variants: {len(variants)}, shape: {variants[0].shape}")

    preview = (
        variants[0].transpose(1, 2, 0)[:, :, ::-1] * 127.5 + 127.5
    ).astype(np.uint8)
    cv2.imwrite("enhanced_face.jpg", preview)
    print("Saved: enhanced_face.jpg")