import { db } from './index';
import { sql } from 'drizzle-orm';

async function dropTables() {
    console.log('Dropping tables...');
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS roles CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS patients CASCADE`);
    console.log('Tables dropped.');
    process.exit(0);
}

dropTables().catch((err) => {
    console.error('Failed to drop tables:', err);
    process.exit(1);
});
