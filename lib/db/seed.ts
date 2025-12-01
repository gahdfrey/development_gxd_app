
import { db } from './index';
import { roles } from './schema';

async function seed() {
    console.log('Seeding roles...');

    const rolesToSeed = [
        { name: 'doctor', description: 'Medical Doctor' },
        { name: 'nurse', description: 'Nurse' },
        { name: 'superadmin', description: 'System Administrator' },
    ];

    for (const role of rolesToSeed) {
        await db.insert(roles).values(role).onConflictDoNothing();
    }

    console.log('Roles seeded successfully.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
