const { Client } = require('pg');
require('dotenv').config();

async function testTimezone() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://homura_user:homura123@localhost:5432/attendance_db',
  });

  try {
    await client.connect();
    
    console.log('--- KIỂM TRA MÚI GIỜ HỆ THỐNG ---');
    
    // 1. Giờ của máy tính (OS Time)
    const osTime = new Date();
    console.log('\n1. Giờ máy tính của bạn (Windows):');
    console.log('   - Chuỗi: ', osTime.toString());
    console.log('   - ISO:   ', osTime.toISOString());
    console.log('   - Việt Nam: ', osTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));

    // 2. Giờ của Database (PostgreSQL inside Docker)
    const dbRes = await client.query('SELECT NOW() as db_now, CURRENT_SETTING(\'TIMEZONE\') as db_tz');
    const dbNow = dbRes.rows[0].db_now;
    const dbTz = dbRes.rows[0].db_tz;
    
    console.log('\n2. Giờ trong Database (Postgres Docker):');
    console.log('   - Dữ liệu thô: ', dbNow);
    console.log('   - Múi giờ thiết lập: ', dbTz);
    console.log('   - Dịch ra chuỗi: ', new Date(dbNow).toString());

    // 3. Kiểm tra một phiên học gần nhất
    const sessionRes = await client.query('SELECT created_at, session_id FROM sessions ORDER BY created_at DESC LIMIT 1');
    if (sessionRes.rows.length > 0) {
      const s = sessionRes.rows[0];
      console.log('\n3. Phiên học gần nhất trong DB:');
      console.log('   - session_id (Mã do bạn tạo): ', s.session_id);
      if (!isNaN(parseInt(s.session_id))) {
        console.log('     => Giờ bạn bấm máy: ', new Date(parseInt(s.session_id)).toLocaleString('vi-VN'));
      }
      console.log('   - created_at (DB tự ghi):    ', s.created_at);
      console.log('     => Giờ DB ghi nhận:   ', new Date(s.created_at).toLocaleString('vi-VN'));
    }

    console.log('\n---------------------------------');
    if (osTime.getHours() !== new Date(dbNow).getHours()) {
      console.log('==> KẾT LUẬN: CÓ sự lệch múi giờ giữa máy tính và Database!');
    } else {
      console.log('==> KẾT LUẬN: Múi giờ đang trùng khớp (hoặc bạn đã cấu hình Docker khớp giờ).');
    }

  } catch (err) {
    console.error('Lỗi kiểm tra:', err);
  } finally {
    await client.end();
  }
}

testTimezone();
