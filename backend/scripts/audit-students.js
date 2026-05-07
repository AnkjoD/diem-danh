const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function auditStudents() {
  const client = new Client({
    user: process.env.DB_USERNAME,
    host: 'localhost',
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();
    console.log('--- Đang kiểm tra dữ liệu học sinh ---');

    const res = await client.query('SELECT id, student_code, name, email, phone FROM students');
    const students = res.rows;
    
    console.log(`Tổng số học sinh: ${students.length}`);
    
    const issues = [];

    students.forEach(s => {
      let hasIssue = false;
      let reasons = [];

      // Kiểm tra Email
      if (s.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(s.email)) {
          hasIssue = true;
          reasons.push(`Email không hợp lệ: "${s.email}"`);
        }
        // Kiểm tra nếu email trông giống số điện thoại
        if (/^\d{8,12}$/.test(s.email.replace(/\s+/g, ''))) {
          hasIssue = true;
          reasons.push(`Email trông giống SĐT: "${s.email}"`);
        }
      }

      // Kiểm tra SĐT
      if (s.phone) {
        const phoneDigits = s.phone.replace(/\D/g, '');
        if (phoneDigits.length < 8 || phoneDigits.length > 12) {
          hasIssue = true;
          reasons.push(`SĐT có độ dài bất thường: "${s.phone}"`);
        }
        if (s.phone.includes('@')) {
          hasIssue = true;
          reasons.push(`SĐT trông giống Email: "${s.phone}"`);
        }
      }

      if (hasIssue) {
        issues.push({
          id: s.id,
          code: s.student_code,
          name: s.name,
          reasons
        });
      }
    });

    if (issues.length > 0) {
      console.log(`\nPhát hiện ${issues.length} học sinh có dữ liệu nghi vấn:`);
      issues.forEach(issue => {
        console.log(`- [${issue.code}] ${issue.name}:`);
        issue.reasons.forEach(r => console.log(`  * ${r}`));
      });
    } else {
      console.log('\nKhông phát hiện dữ liệu email/phone nào bất thường.');
    }

  } catch (err) {
    console.error('Lỗi kết nối DB:', err.message);
  } finally {
    await client.end();
  }
}

auditStudents();
