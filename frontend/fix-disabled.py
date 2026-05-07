import re

file_path = "c:/Users/Ankkun/Documents/lap_trinh/my_project/diem-danh/frontend/src/components/panels/FaceAttendancePanel.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix ImportButton disabled
content = re.sub(
    r"disabled=\{\s*!selectedClass \|\|\s*classStudents\.length === 0 \|\|\s*recognizeMut\.isPending \|\|\s*isTimeInvalid\s*\}",
    "disabled={\n              !selectedClass ||\n              classStudents.length === 0 ||\n              recognizeMut.isPending ||\n              isTimeInvalid ||\n              isLoadingTodaySession\n            }",
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed disabled props!")
