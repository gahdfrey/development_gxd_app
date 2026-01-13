
import { db } from './lib/db';
import { roles } from './lib/db/schema';

async function verifyPermissions() {
    console.log('Verifying role permissions...');
    const allRoles = await db.select().from(roles);

    for (const role of allRoles) {
        console.log(`Role: ${role.name}`);
        console.log(`Permissions: ${JSON.stringify(role.permissions, null, 2)}`);
        if (!role.permissions) {
            console.error(`ERROR: Role ${role.name} has NO permissions!`);
        }
    }
    process.exit(0);
}

verifyPermissions().catch(console.error);
