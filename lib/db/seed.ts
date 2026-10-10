import 'dotenv/config';
import { db } from './index';
import { roles, hmos } from './schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

const ORG_ID = 1; // Dleventh Clinic

async function seed() {
    const defaultRoles = [
        {
            name: 'Doctor',
            description: 'Medical professional with access to patient records',
            permissions: {
                dashboard: ['view'],
                'patient-history': ['view', 'print'],
                analytics: [],
                patients: ['add', 'view', 'edit', 'print'],
                appointments: ['add', 'view', 'edit'],
                'my-appointments': ['view'],
                'all-appointments': [],
                admission: ['add', 'view', 'edit'],
                users: [],
                'data-requests': [],
                roles: [],
                setup: [],
            },
        },
        {
            name: 'Nurse',
            description: 'Medical support staff',
            permissions: {
                dashboard: ['view'],
                'patient-history': ['view', 'print'],
                analytics: [],
                patients: ['view', 'add'],
                appointments: ['view'],
                'my-appointments': ['view'],
                'all-appointments': [],
                admission: ['view', 'edit'],
                users: [],
                'data-requests': [],
                roles: [],
                setup: [],
            },
        },
        {
            name: 'Superadmin',
            description: 'Full system access',
            permissions: {
                dashboard: ['add', 'edit', 'view', 'delete', 'print'],
                'patient-history': ['view', 'print'],
                analytics: ['view'],
                patients: ['add', 'view', 'edit', 'delete', 'print'],
                appointments: ['add', 'view', 'edit', 'delete', 'print'],
                'my-appointments': ['view'],
                'all-appointments': ['add', 'view', 'edit', 'delete', 'print'],
                admission: ['add', 'view', 'edit', 'delete', 'print'],
                users: ['add', 'view', 'delete', 'print'],
                'data-requests': ['add', 'view', 'edit', 'delete'],
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

    // HMOs are per organisation; seed the defaults into ORG_ID only. (The
    // unique index is on lower(name) for non-deleted rows, which ON CONFLICT
    // can't target, so check first.)
    for (const hmo of defaultHmos) {
        const [existing] = await db.select({ id: hmos.id }).from(hmos).where(and(
            eq(hmos.organisationId, ORG_ID),
            sql`lower(${hmos.name}) = lower(${hmo.name})`,
            isNull(hmos.deletedAt),
        ));
        if (existing) {
            await db.update(hmos).set({ description: hmo.description }).where(eq(hmos.id, existing.id));
        } else {
            await db.insert(hmos).values({ ...hmo, organisationId: ORG_ID });
        }
    }

    console.log('HMOs seeded successfully.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
