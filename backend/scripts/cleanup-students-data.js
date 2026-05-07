const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function cleanupStudents() {
  const client = new Client({
    user: process.env.DB_USERNAME,
    host: 'localhost',
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();
    console.log('--- Bắt đầu dọn dẹp dữ liệu học sinh lỗi ---');

    // Tìm các bản ghi có email/phone chứa "V", "P" hoặc dấu ngoặc (biểu hiện của dữ liệu điểm danh bị nhập nhầm)
    const sql = `
      UPDATE students 
      SET 
        email = CASE 
          WHEN email IN ('V', 'P', 'X') OR email LIKE '%(%)%' THEN NULL 
          ELSE email 
        END,
        phone = CASE 
          WHEN phone IN ('V', 'P', 'X') OR phone LIKE '%(%)%' THEN NULL 
          ELSE phone 
        END
      WHERE 
        email IN ('V', 'P', 'X') OR email LIKE '%(%)%'
        OR phone IN ('V', 'P', 'X') OR phone LIKE '%(%)%'
    `;

    const res = await client.query(sql);
    console.log(`Đã dọn dẹp thành công ${res.rowCount} bản ghi bị lỗi dữ liệu.`);

  } catch (err) {
    console.error('Lỗi khi dọn dẹp DB:', err.message);
  } finally {
    await client.end();
  }
}

cleanupStudents();
