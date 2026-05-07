const { Client } = require('pg');
async function main() {
  const client = new Client({ user: 'homura_user', host: 'localhost', database: 'attendance_db', password: 'homura123', port: 5432 });
  await client.connect();
  
  const classId = '6e326544-b444-4744-96b9-9168ec9b604e'; // DHKTPM19ETT

  // 1. Tạo 1 phiên cho NGÀY HÔM NAY
  const now = new Date();
  const sessionIdStr = now.getTime().toString();
  const res = await client.query(`
    INSERT INTO sessions (class_id, session_id, created_at)
    VALUES ($1, $2, $3)
    RETURNING id
  `, [classId, sessionIdStr, now.toISOString()]);
  const newId = res.rows[0].id;
  console.log('--- BƯỚC 1: Đã tạo phiên cho HÔM NAY ---');
  console.log('Session UUID:', newId);
  console.log('Session Time:', now.toLocaleString());

  // 2. Thêm 1 người điểm danh cho phiên này
  // Lấy 1 student bất kỳ trong lớp
  const studentRes = await client.query(`
    SELECT student_id FROM class_students WHERE class_id = $1 LIMIT 1
  `, [classId]);
  const studentId = studentRes.rows[0].student_id;
  
  await client.query(`
    INSERT INTO attendances (session_id, student_id, status, created_at)
    VALUES ($1, $2, 'present', $3)
  `, [newId, studentId, now.toISOString()]);
  console.log('--- BƯỚC 2: Đã đánh dấu 1 sinh viên có mặt ---');

  console.log('\n>>> BÂY GIỜ BẠN HÃY F5 DASHBOARD: Bạn sẽ thấy có 1 người ĐÃ ĐIỂM DANH.');
  
  await client.end();
}
main().catch(console.error);
