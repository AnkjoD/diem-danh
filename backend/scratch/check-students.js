const { Client } = require('pg');
require('dotenv').config();

async function checkStudents() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://homura_user:homura123@localhost:5432/attendance_db',
  });

  try {
    await client.connect();
    const res = await client.query('SELECT count(*) as total, count(face_descriptor) as registered FROM students');
    console.log(`Tổng số sinh viên: ${res.rows[0].total}`);
    console.log(`Số sinh viên đã có khuôn mặt: ${res.rows[0].registered}`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkStudents();
