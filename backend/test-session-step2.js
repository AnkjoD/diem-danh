const { Client } = require('pg');
async function main() {
  const client = new Client({ user: 'homura_user', host: 'localhost', database: 'attendance_db', password: 'homura123', port: 5432 });
  await client.connect();
  
  const classId = '6e326544-b444-4744-96b9-9168ec9b604e';

  // Lấy phiên mới nhất mà tôi vừa tạo lúc nãy (đang là ngày 23)
  const res = await client.query(`
    SELECT id FROM sessions WHERE class_id = $1 ORDER BY created_at DESC LIMIT 1
  `, [classId]);
  
  if (res.rows.length === 0) {
    console.log('Không tìm thấy phiên nào!');
    await client.end();
    return;
  }

  const id = res.rows[0].id;
  
  // GIẢ LẬP: Đẩy thời gian về 24 tiếng trước (Ngày 22/04)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIdStr = yesterday.getTime().toString();

  await client.query(`
    UPDATE sessions 
    SET created_at = $1, session_id = $2
    WHERE id = $3
  `, [yesterday.toISOString(), yesterdayIdStr, id]);

  await client.query(`
    UPDATE attendances 
    SET created_at = $1
    WHERE session_id = $2
  `, [yesterday.toISOString(), id]);

  console.log('--- BƯỚC 2 THÀNH CÔNG ---');
  console.log('Đã biến phiên vừa rồi thành phiên ngày 22/04 (Quá khứ).');
  console.log('\n>>> BÂY GIỜ BẠN HÃY F5 DASHBOARD:');
  console.log('1. Phần Điểm danh: Sẽ trắng tinh (Vắng chờ hết), vì hệ thống coi hôm nay chưa có phiên.');
  console.log('2. Phần Lịch sử: Bạn sẽ thấy phiên 1 người lúc nãy đã nhảy vào ngày 22/04.');
  console.log('3. Thử quét QR: Nếu bạn dùng mã QR cũ của phiên này, nó sẽ báo lỗi/không hợp lệ!');

  await client.end();
}
main().catch(console.error);
