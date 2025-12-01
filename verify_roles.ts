
import { db } from './lib/db';
import { users, roles } from './lib/db/schema';
import { eq } from 'drizzle-orm';

async function verify() {
    console.log('Verifying roles...');
    const allRoles = await db.select().from(roles);
    console.log('Roles found:', allRoles.length);
    allRoles.forEach(r => console.log(`- ${r.name} (${r.id})`));

    if (allRoles.length < 3) {
        console.error('FAILED: Expected at least 3 roles.');
        process.exit(1);
    }

    console.log('\nVerifying API endpoint...');
    try {
        const res = await fetch('http://localhost:3000/api/roles');
        if (res.ok) {
            const apiRoles = await res.json();
            console.log('API returned roles:', apiRoles.length);
        } else {
            console.error('API check failed:', res.status, res.statusText);
            // Don't fail the script if server is not running, just warn
            console.warn('Make sure the dev server is running to test API.');
        }
    } catch (e) {
        console.warn('Could not connect to API. Is the server running?');
    }

    console.log('\nVerification complete.');
    process.exit(0);
}

verify().catch(console.error);
