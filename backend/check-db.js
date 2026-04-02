const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

async function checkDb() {
  const client = new Client({
    user: process.env.DB_USERNAME,
    host: 'localhost',
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();
    console.log('--- Connected to Database ---');

    const sessions = await client.query('SELECT count(*) FROM sessions');
    console.log('Total sessions:', sessions.rows[0].count);

    const firstSessions = await client.query('SELECT id, class_id, session_id, created_at FROM sessions LIMIT 5');
    console.log('Sample sessions:', JSON.stringify(firstSessions.rows, null, 2));

    const classes = await client.query('SELECT id, name, teacher_id FROM classes LIMIT 5');
    console.log('Sample classes:', JSON.stringify(classes.rows, null, 2));

    const teachers = await client.query('SELECT id, full_name, email FROM teachers LIMIT 5');
    console.log('Sample teachers:', JSON.stringify(teachers.rows, null, 2));

  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  } finally {
    await client.end();
  }
}

checkDb();
