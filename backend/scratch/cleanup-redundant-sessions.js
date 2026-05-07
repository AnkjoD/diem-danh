const { Client } = require('pg');
require('dotenv').config();

async function cleanupSessions() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://homura_user:homura123@localhost:5432/attendance_db',
  });

  try {
    await client.connect();
    console.log('--- BẮT ĐẦU DỌN DẸP PHIÊN TRÙNG LẶP ---');

    // 1. Lấy tất cả các phiên, kèm theo số lượng điểm danh
    const res = await client.query(`
      SELECT s.id, s.class_id, s.created_at, s.session_id,
             (SELECT count(*) FROM attendances a WHERE a.session_id = s.id) as attendance_count
      FROM sessions s
      ORDER BY s.class_id, s.created_at ASC
    `);

    const sessions = res.rows;
    const groups = {};

    // 2. Nhóm các phiên theo Lớp và Ngày (không tính giờ)
    sessions.forEach(s => {
      const date = new Date(s.created_at).toLocaleDateString('en-CA'); // YYYY-MM-DD
      const key = `${s.class_id}_${date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    let totalDeleted = 0;
    let totalMerged = 0;

    // 3. Xử lý từng nhóm
    for (const key in groups) {
      const group = groups[key];
      if (group.length > 1) {
        console.log(`\nPhát hiện ${group.length} phiên trùng ngày cho nhóm ${key}`);
        
        // Chọn phiên "Thắng cuộc" là phiên có nhiều điểm danh nhất, hoặc phiên đầu tiên
        group.sort((a, b) => b.attendance_count - a.attendance_count);
        const winner = group[0];
        const losers = group.slice(1);

        console.log(`- Giữ lại phiên: ${winner.id} (${winner.attendance_count} lượt)`);

        for (const loser of losers) {
          // Chuyển điểm danh từ phiên cũ sang phiên mới (nếu có)
          if (parseInt(loser.attendance_count) > 0) {
            console.log(`  -> Đang gộp ${loser.attendance_count} điểm danh từ ${loser.id} sang ${winner.id}...`);
            
            // Kiểm tra xem sinh viên đã có điểm danh ở phiên winner chưa để tránh trùng PK
            const loserAttendances = await client.query('SELECT student_id FROM attendances WHERE session_id = $1', [loser.id]);
            for (const att of loserAttendances.rows) {
              const check = await client.query('SELECT id FROM attendances WHERE session_id = $1 AND student_id = $2', [winner.id, att.student_id]);
              if (check.rows.length === 0) {
                await client.query('UPDATE attendances SET session_id = $1 WHERE session_id = $2 AND student_id = $3', [winner.id, loser.id, att.student_id]);
                totalMerged++;
              } else {
                // Nếu đã có rồi thì xóa luôn điểm danh ở phiên loser
                await client.query('DELETE FROM attendances WHERE session_id = $1 AND student_id = $2', [loser.id, att.student_id]);
              }
            }
          }
          
          // Xóa phiên thừa
          await client.query('DELETE FROM sessions WHERE id = $1', [loser.id]);
          totalDeleted++;
          console.log(`  -> Đã xóa phiên thừa: ${loser.id}`);
        }
      }
    }

    console.log(`\n--- HOÀN TẤT ---`);
    console.log(`Tổng số phiên thừa đã xóa: ${totalDeleted}`);
    console.log(`Tổng số bản ghi điểm danh đã gộp: ${totalMerged}`);

  } catch (err) {
    console.error('Lỗi khi dọn dẹp:', err);
  } finally {
    await client.end();
  }
}

cleanupSessions();
