
import { db } from './index';
import { roles } from './schema';

async function seed() {
    // console.log('Seeding roles...');

    const defaultRoles = [
        {
            name: 'doctor',
            description: 'Medical professional with access to patient records',
            permissions: {
                users: [],
                dashboard: ['view'],
                patients: ['add', 'view', 'edit', 'print'],
            },
        },
        {
            name: 'nurse',
            description: 'Medical support staff',
            permissions: {
                users: [],
                dashboard: ['view'],
                patients: ['view', 'add'],
            },
        },
        {
            name: 'superadmin',
            description: 'Full system access',
            permissions: {
                users: ['add', 'view', 'delete', 'print'],
                dashboard: ['add', 'edit', 'view', 'delete', 'print'],
                patients: ['add', 'view', 'edit', 'delete', 'print'],
            },
        },
    ];

    for (const role of defaultRoles) {
        // Try to insert, if conflict on 'name', update the permissions and description
        await db.insert(roles)
            .values(role)
            .onConflictDoUpdate({
                target: roles.name,
                set: {
                    permissions: role.permissions,
                    description: role.description,
                },
            });
    }

    console.log('Roles seeded successfully.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
