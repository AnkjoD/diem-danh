const { DataSource } = require('typeorm');
const path = require('path');

async function checkData() {
  const ds = new DataSource({
    type: 'sqlite', // Assuming sqlite based on previous logs, adjust if different
    database: 'database.sqlite', // Adjust path
    entities: [path.join(__dirname, 'src/**/*.entity.ts')],
    synchronize: false,
  });

  try {
    await ds.initialize();
    const sessionRepo = ds.getRepository('Session');
    const attRepo = ds.getRepository('Attendance');

    const latestSession = await sessionRepo.findOne({
      order: { created_at: 'DESC' },
      relations: ['attendances', 'attendances.student']
    });

    console.log('Latest Session ID:', latestSession?.id);
    console.log('Session Created At:', latestSession?.created_at);
    console.log('Attendance Count:', latestSession?.attendances?.length);
    
    if (latestSession?.attendances) {
      const stats = latestSession.attendances.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {});
      console.log('Status Stats:', stats);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await ds.destroy();
  }
}

checkData();
