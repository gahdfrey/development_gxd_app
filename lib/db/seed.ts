import 'dotenv/config';
import { db } from './index';
import { roles, hmos } from './schema';

const ORG_ID = 1; // Dleventh Clinic

async function seed() {
    const defaultRoles = [
        {
            name: 'Doctor',
            description: 'Medical professional with access to patient records',
            permissions: {
                dashboard: ['view'],
                patients: ['add', 'view', 'edit', 'print'],
                appointments: ['add', 'view', 'edit'],
                'my-appointments': ['view'],
                'all-appointments': [],
                users: [],
                roles: [],
                setup: [],
            },
        },
        {
            name: 'Nurse',
            description: 'Medical support staff',
            permissions: {
                dashboard: ['view'],
                patients: ['view', 'add'],
                appointments: ['view'],
                'my-appointments': ['view'],
                'all-appointments': [],
                users: [],
                roles: [],
                setup: [],
            },
        },
        {
            name: 'Superadmin',
            description: 'Full system access',
            permissions: {
                dashboard: ['add', 'edit', 'view', 'delete', 'print'],
                patients: ['add', 'view', 'edit', 'delete', 'print'],
                appointments: ['add', 'view', 'edit', 'delete', 'print'],
                'my-appointments': ['view'],
                'all-appointments': ['add', 'view', 'edit', 'delete', 'print'],
                users: ['add', 'view', 'delete', 'print'],
                roles: ['add', 'view', 'edit', 'delete'],
                setup: ['view', 'edit'],
            },
        },
    ];

    for (const role of defaultRoles) {
        await db.insert(roles)
            .values({ ...role, organisationId: ORG_ID })
            .onConflictDoUpdate({
                target: [roles.name, roles.organisationId],
                set: {
                    permissions: role.permissions,
                    description: role.description,
                },
            });
    }

    console.log('Roles seeded successfully.');

    const defaultHmos = [
        { name: 'Leadway Health',  description: 'Leadway Health HMO - comprehensive health coverage' },
        { name: 'Hygeia HMO',      description: 'Hygeia HMO - quality healthcare services' },
        { name: 'Reliance HMO',    description: 'Reliance HMO - affordable health insurance' },
    ];

    for (const hmo of defaultHmos) {
        await db.insert(hmos)
            .values(hmo)
            .onConflictDoUpdate({
                target: hmos.name,
                set: { description: hmo.description },
            });
    }

    console.log('HMOs seeded successfully.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
