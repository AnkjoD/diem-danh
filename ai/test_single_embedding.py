import json
import faiss
import numpy as np
from src.matcher import FaceMatcher

matcher = FaceMatcher()

kiet_id = '0db17539-b785-4c1c-9cae-879b44e271b4'
c1bee_id = 'c1bee38a-4a88-4dff-aa41-08097a40cc8d'

kiet_pos = [i for i, x in enumerate(matcher.id_mapping) if x == kiet_id]
c1bee_pos = [i for i, x in enumerate(matcher.id_mapping) if x == c1bee_id]

print(f"KIET has {len(kiet_pos)} embeddings, c1bee has {len(c1bee_pos)} embeddings")

# Lay embedding vec[24] cua KIET (theo log truoc, gan c1bee nhat voi dist=0.65)
v_kiet = matcher.index.reconstruct(kiet_pos[1])
v_c1bee = matcher.index.reconstruct(c1bee_pos[0])

# Them nhieu nho de gia lap anh thuc te
noise = np.random.normal(0, 0.05, v_kiet.shape).astype(np.float32)
v_test = v_kiet + noise

d_kiet = float(np.sum((v_test - v_kiet)**2))
d_c1bee = float(np.sum((v_test - v_c1bee)**2))
print(f"Distance test -> KIET: {d_kiet:.4f}, c1bee: {d_c1bee:.4f}")
winner = "KIET" if d_kiet < d_c1bee else "c1bee (SAI)"
print(f"Top-1 naive: {winner}")

# Test voi voting
result_id, dist = matcher.search_face(v_test, threshold=1.2)
label = "KIET" if result_id == kiet_id else str(result_id)
print(f"Voting result: {label} (dist={dist:.4f})")

# ---- Test truong hop chi co 1 anh dang ky ----
print("\n--- Gia lap chi dang ky 1 anh (chi dung vec[24]) ---")
# Tao FAISS tam thoi chi chua 1 embedding cua KIET va 1 cua c1bee
tmp_index = faiss.IndexFlatL2(512)
tmp_map = []
tmp_index.add(np.array([v_kiet], dtype=np.float32))
tmp_map.append(kiet_id)
tmp_index.add(np.array([v_c1bee], dtype=np.float32))
tmp_map.append(c1bee_id)

# Tao matcher tam thoi
class TempMatcher:
    def __init__(self):
        self.index = tmp_index
        self.id_mapping = tmp_map
    def search_face(self, embedding, threshold=1.2):
        return matcher.search_face.__func__(self, embedding, threshold)

# Viet lai nhanh: search tren tmp_index
k = min(max(10, tmp_index.ntotal // 2), tmp_index.ntotal)
vector = np.array([v_test], dtype=np.float32)
distances, indices = tmp_index.search(vector, k)
print(f"Top-{k} results from 1-embedding DB:")
for dist_val, idx in zip(distances[0], indices[0]):
    sid = tmp_map[idx]
    label = "KIET" if sid == kiet_id else "c1bee"
    print(f"  {label}: dist={dist_val:.4f}")

# Voting tren tmp
cands = {}
for dist_val, idx in zip(distances[0], indices[0]):
    if idx < 0 or idx >= len(tmp_map):
        continue
    if float(dist_val) > 1.2:
        continue
    sid = tmp_map[idx]
    cands.setdefault(sid, []).append(float(dist_val))

if cands:
    best = max(cands, key=lambda s: (len(cands[s]), -min(cands[s])))
    label = "KIET" if best == kiet_id else "c1bee (SAI)"
    print(f"Voting winner (1 anh): {label} (votes={len(cands[best])}, dist={min(cands[best]):.4f})")
else:
    print("Khong co ai dat nguong -> No match")
