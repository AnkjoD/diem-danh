import os
import json
import faiss
import numpy as np
from typing import List, Tuple, Optional

class FaceMatcher:
    def __init__(self, dimension: int = 512, index_file: str = "./databases/db.bin", map_file: str = "./databases/db.json"):
        self.dimension = dimension
        self.index_file = index_file
        self.map_file = map_file
        self.index = faiss.IndexFlatL2(self.dimension)
        self.id_mapping: List[str] = []
        self._load()

    def add_face(self, embedding: np.ndarray, employee_id: str) -> None:
        vector = np.array([embedding], dtype=np.float32)
        self.index.add(vector)
        self.id_mapping.append(employee_id)
        self._save()

    def search_face(self, embedding: np.ndarray, threshold: float = 1.2) -> Tuple[Optional[str], float]:
        if self.index.ntotal == 0:
            return None, 999.0

        vector = np.array([embedding], dtype=np.float32)
        # Search top-K: ít nhất là số embeddings có trong DB * 2 để đảm bảo bắt được mọi người
        k = min(max(10, self.index.ntotal // 2), self.index.ntotal)
        distances, indices = self.index.search(vector, k)

        # --- Voting: Gom nhóm theo student_id, tính điểm mỗi người ---
        # Điểm số = số lần xuất hiện trong top-K với dist <= threshold (càng nhiều càng tốt)
        # Trong nhóm cùng người: lấy min distance làm đại diện
        candidate_scores: dict[str, list[float]] = {}
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.id_mapping):
                continue
            if float(dist) > threshold:
                continue
            sid = self.id_mapping[idx]
            if sid not in candidate_scores:
                candidate_scores[sid] = []
            candidate_scores[sid].append(float(dist))

        if candidate_scores:
            # Ưu tiên: (số lần xuất hiện nhiều nhất, min distance nhỏ nhất)
            best_id = max(
                candidate_scores,
                key=lambda sid: (len(candidate_scores[sid]), -min(candidate_scores[sid]))
            )
            best_dist = min(candidate_scores[best_id])
            print(f"[Matcher] Voted winner: {best_id} (votes={len(candidate_scores[best_id])}, best_dist={best_dist:.4f})")
            return best_id, best_dist

        # FALLBACK: Cosine similarity nếu không ai đạt threshold L2
        cosine_threshold = 0.45
        cosine_candidates: dict[str, list[float]] = {}
        for i in range(min(k, len(distances[0]))):
            idx = int(indices[0][i])
            if 0 <= idx < len(self.id_mapping):
                db_vector = self.index.reconstruct(idx)
                cos_sim = float(np.dot(embedding, db_vector) / (np.linalg.norm(embedding) * np.linalg.norm(db_vector)))
                if cos_sim >= cosine_threshold:
                    sid = self.id_mapping[idx]
                    if sid not in cosine_candidates:
                        cosine_candidates[sid] = []
                    cosine_candidates[sid].append(cos_sim)

        if cosine_candidates:
            best_id = max(
                cosine_candidates,
                key=lambda sid: (len(cosine_candidates[sid]), max(cosine_candidates[sid]))
            )
            best_cos = max(cosine_candidates[best_id])
            best_l2 = float(distances[0][0])
            print(f"[Matcher] Cosine fallback winner: {best_id} (votes={len(cosine_candidates[best_id])}, cos={best_cos:.4f})")
            return best_id, best_l2

        return None, float(distances[0][0])

    def _save(self) -> None:
        os.makedirs(os.path.dirname(self.index_file), exist_ok=True)
        os.makedirs(os.path.dirname(self.map_file), exist_ok=True)
        faiss.write_index(self.index, self.index_file)
        with open(self.map_file, 'w', encoding='utf-8') as f:
            json.dump(self.id_mapping, f)

    def _load(self) -> None:
        if os.path.exists(self.index_file):
            self.index = faiss.read_index(self.index_file)
        if os.path.exists(self.map_file):
            with open(self.map_file, 'r', encoding='utf-8') as f:
                self.id_mapping = json.load(f)
    
    def delete_face(self, employee_id: str) -> bool:
        # Nếu không có trong danh sách thì báo False luôn
        if employee_id not in self.id_mapping:
            return False
            
        # Tìm tất cả các vị trí (index) KHÔNG PHẢI của sinh viên cần xóa
        indices_to_keep = [i for i, emp_id in enumerate(self.id_mapping) if emp_id != employee_id]
        
        # Trường hợp xóa xong không còn ai trong Database
        if len(indices_to_keep) == 0:
            self.index = faiss.IndexFlatL2(self.dimension)
            self.id_mapping = []
            self._save()
            return True
            
        # Trích xuất lại các vector của những người cần giữ
        # faiss.reconstruct(i) sẽ lấy vector từ RAM ra lại thành numpy array
        vectors_to_keep = np.array([self.index.reconstruct(i) for i in indices_to_keep], dtype=np.float32)
        
        # Đập đi xây lại Index mới cực nhanh
        self.index = faiss.IndexFlatL2(self.dimension)
        self.index.add(vectors_to_keep)
        self.id_mapping = [self.id_mapping[i] for i in indices_to_keep]
        
        # Lưu đè xuống file db.bin và db.json
        self._save()
        
        return True