import * as XLSX from 'xlsx';

export interface ParsedStudent {
  student_code: string;
  name: string;
  email?: string;
  phone?: string;
}

/**
 * Chuẩn hóa chuỗi để so khớp tên cột (Bỏ dấu, viết thường, xóa khoảng trắng)
 */
const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s-]/g, '');
};

/**
 * Bản đồ các từ khóa gợi ý cho từng cột
 */
const COLUMN_MAPS = {
  student_code: ['mssv', 'masv', 'maso', 'masosinhvien', 'studentcode', 'code', 'id', 'student_code', 'ma', 'mahocsinh'],
  name: ['hoten', 'ten', 'name', 'fullname', 'hovaten', 'sinhvien', 'hotenvaten', 'studentname', 'full_name', 'full-name', 'tensinhvien', 'tenhocsinh'],
  email: ['email', 'thudientu', 'mail', 'gmail', 'diachiemail'],
  phone: ['sdt', 'sodienthoai', 'phone', 'tel', 'telephone', 'lienhe', 'phonenumber', 'didong', 'mobile'],
};

export const parseStudentFile = (file: File): Promise<ParsedStudent[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Chuyển sang JSON dạng mảng các mảng (header: 1)
        // raw: false giúp lấy giá trị đã format (như chuỗi thay vì số khoa học)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false }) as any[][];
        
        if (rows.length === 0) {
          return resolve([]);
        }

        // Tìm hàng chứa Header (thường là hàng đầu tiên có chứa từ khóa mssv hoặc tên)
        let headerRowIndex = -1;
        let colIndexes = { student_code: -1, name: -1, email: -1, phone: -1 };

        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const row = rows[i].map(cell => normalizeHeader(String(cell || '')));
          
          const foundCodeIdx = row.findIndex(cell => COLUMN_MAPS.student_code.some(k => cell === k || cell.includes(k)));
          const foundNameIdx = row.findIndex(cell => COLUMN_MAPS.name.some(k => cell === k || cell.includes(k)));

          if (foundCodeIdx !== -1 && foundNameIdx !== -1) {
            headerRowIndex = i;
            colIndexes.student_code = foundCodeIdx;
            colIndexes.name = foundNameIdx;
            
            // Tìm các cột khác (không bắt buộc)
            colIndexes.email = row.findIndex(cell => COLUMN_MAPS.email.some(k => cell.includes(k)));
            colIndexes.phone = row.findIndex(cell => COLUMN_MAPS.phone.some(k => cell.includes(k)));
            break;
          }
        }

        // Nếu không tìm thấy cột bắt buộc (MSSV và Tên), báo lỗi ngay thay vì giả định
        if (headerRowIndex === -1 || colIndexes.student_code === -1 || colIndexes.name === -1) {
          return reject(new Error('Không tìm thấy cột "Mã SV" và "Họ Tên" trong file. Vui lòng kiểm tra lại tên tiêu đề cột.'));
        }

        const result: ParsedStudent[] = [];
        const startDataIndex = headerRowIndex + 1;

        for (let i = startDataIndex; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const student_code = String(row[colIndexes.student_code] || '').trim();
          const name = String(row[colIndexes.name] || '').trim();

          // Kiểm tra tính hợp lệ của dòng:
          // 1. Phải có MSSV và Tên
          // 2. MSSV không được là tiêu đề cột (trường hợp lặp lại header)
          // 3. Tên không được quá ngắn (ví dụ rác)
          const isHeader = COLUMN_MAPS.student_code.includes(normalizeHeader(student_code));
          
          if (student_code && name && !isHeader && name.length >= 2) {
            result.push({
              student_code,
              name,
              email: colIndexes.email !== -1 && row[colIndexes.email] ? String(row[colIndexes.email]).trim() : '',
              phone: colIndexes.phone !== -1 && row[colIndexes.phone] ? String(row[colIndexes.phone]).trim() : '',
            });
          }
        }

        if (result.length === 0) {
          return reject(new Error('File không chứa dữ liệu học sinh hợp lệ hoặc bị trống.'));
        }

        resolve(result);
      } catch (error) {
        reject(new Error('Không thể đọc file. Vui lòng kiểm tra định dạng Excel/CSV.'));
      }
    };

    reader.onerror = () => reject(new Error('Lỗi đọc file.'));
    reader.readAsArrayBuffer(file);
  });
};
