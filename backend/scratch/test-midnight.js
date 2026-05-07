const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });
const axios = require('axios');

async function testMidnightTransition() {
  const client = new Client({
    host: 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'homura',
  });

  try {
    await client.connect();
    console.log('🔗 Đã kết nối Database.');

    // 1. Lấy một class_id hợp lệ
    const classRes = await client.query('SELECT id FROM classes LIMIT 1');
    if (classRes.rows.length === 0) throw new Error('Không tìm thấy lớp học nào để test');
    const classId = classRes.rows[0].id;

    // 2. Tạo một phiên điểm danh "GIẢ LẬP" với thời gian tạo là 23:59 ngày HÔM QUA
    console.log('⏰ Đang tạo phiên điểm danh giả lập vào lúc 23:59 ngày hôm qua...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 0); // Đặt giờ thành 23:59

    const insertRes = await client.query(
      `INSERT INTO sessions (class_id, created_at) VALUES ($1, $2) RETURNING id, created_at`,
      [classId, yesterday]
    );
    const mockSession = insertRes.rows[0];
    console.log(`✅ Đã tạo phiên cũ: ID=${mockSession.id} | Giờ tạo=${mockSession.created_at.toLocaleString()}`);

    // 3. Gọi API Verify để xem Backend có chặn cái phiên "hôm qua" này không (vì hiện tại đã qua ngày mới)
    console.log('\n🚀 Đang gọi API kiểm tra mã QR từ Frontend...');
    try {
      const response = await axios.get(`http://localhost:4000/sessions/verify/${mockSession.id}`);
      
      console.log('=> Kết quả trả về từ Backend:', response.data);
      
      if (response.data.valid === false) {
        console.log('\n🎉 TEST THÀNH CÔNG: Backend ĐÃ CHẶN phiên điểm danh qua ngày!');
      } else {
        console.log('\n❌ TEST THẤT BẠI: Backend VẪN CHO PHÉP phiên cũ!');
      }
    } catch (err) {
      console.error('Lỗi khi gọi API:', err.message);
    }

    // 4. Dọn dẹp rác test
    await client.query('DELETE FROM sessions WHERE id = $1', [mockSession.id]);
    console.log('🧹 Đã xóa phiên test.');

  } catch (error) {
    console.error('Lỗi Test:', error);
  } finally {
    await client.end();
  }
}

testMidnightTransition();
