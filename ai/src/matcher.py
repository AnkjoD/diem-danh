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

    def search_face(self, embedding: np.ndarray, threshold: float = 1.0) -> Tuple[Optional[str], float]:
        if self.index.ntotal == 0:
            return None, 999.0
            
        vector = np.array([embedding], dtype=np.float32)
        distances, indices = self.index.search(vector, 1)
        
        best_distance = float(distances[0][0])
        best_idx = int(indices[0][0])
        
        if best_distance > threshold or best_idx < 0 or best_idx >= len(self.id_mapping):
            return None, best_distance
            
        return self.id_mapping[best_idx], best_distance

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