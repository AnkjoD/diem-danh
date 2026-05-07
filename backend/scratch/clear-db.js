const { Client } = require('pg');
require('dotenv').config();

async function clearDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://homura_user:homura123@localhost:5432/attendance_db',
  });

  try {
    await client.connect();
    console.log('--- ĐANG DỌN DẸP TOÀN BỘ DỮ LIỆU ĐIỂM DANH ---');

    // Xóa theo thứ tự để tránh lỗi khóa ngoại
    await client.query('DELETE FROM attendances');
    console.log('- Đã xóa toàn bộ bản ghi điểm danh.');
    
    await client.query('DELETE FROM sessions');
    console.log('- Đã xóa toàn bộ các phiên học.');

    console.log('\n--- HOÀN TẤT ---');
    console.log('Database đã sạch sẽ. Bạn có thể bắt đầu tạo phiên mới ngay bây giờ.');

  } catch (err) {
    console.error('Lỗi khi dọn dẹp:', err);
  } finally {
    await client.end();
  }
}

clearDatabase();
