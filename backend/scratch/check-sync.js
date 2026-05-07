const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function checkNewSession() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://homura_user:homura123@localhost:5432/attendance_db',
  });

  try {
    await client.connect();
    
    console.log('--- ĐANG TẠO PHIÊN MỚI ĐỂ KIỂM TRA ---');
    
    const nowLocal = new Date();
    const sessionId = Date.now().toString();
    
    // Giả sử có một class_id hợp lệ (lấy cái gần nhất)
    const classRes = await client.query('SELECT id FROM classes LIMIT 1');
    if (classRes.rows.length === 0) {
      console.log('Không có lớp nào để test.');
      return;
    }
    const classId = classRes.rows[0].id;

    // Chèn phiên mới
    const insertRes = await client.query(
      'INSERT INTO sessions (id, session_id, class_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING created_at',
      [uuidv4(), sessionId, classId]
    );
    
    const createdAt = insertRes.rows[0].created_at;

    console.log('\nKẾT QUẢ:');
    console.log('1. Giờ bạn bấm (session_id): ', new Date(parseInt(sessionId)).toLocaleString('vi-VN'));
    console.log('2. Giờ DB ghi (created_at):  ', new Date(createdAt).toLocaleString('vi-VN'));
    console.log('   - Giá trị thô từ DB:     ', createdAt);

    if (new Date(parseInt(sessionId)).getHours() === new Date(createdAt).getHours()) {
      console.log('\n==> THÀNH CÔNG: Giờ đã đồng bộ!');
    } else {
      console.log('\n==> THẤB BẠI: Vẫn còn lệch múi giờ.');
    }

    // Xóa session test
    await client.query('DELETE FROM sessions WHERE session_id = $1', [sessionId]);
    console.log('\nĐã xóa dữ liệu test.');

  } catch (err) {
    console.error('Lỗi:', err);
  } finally {
    await client.end();
  }
}

checkNewSession();
