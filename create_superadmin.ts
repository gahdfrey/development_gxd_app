
import { db } from './lib/db';
import { users, roles } from './lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function createSuperadmin() {
    console.log('Creating superadmin user...');

    // 1. Get Superadmin Role ID
    const superadminRole = await db.query.roles.findFirst({
        where: eq(roles.name, 'Superadmin'),
    });

    if (!superadminRole) {
        console.error('Error: Superadmin role not found!');
        process.exit(1);
    }

    // 2. Hash Password
    const password = 'Password!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create User
    const timestamp = Date.now();
    const email = `superadmin_${timestamp}@example.com`;
    const username = `superadmin_${timestamp}`;

    try {
        const newUser = await db.insert(users).values({
            firstname: 'Super',
            lastname: 'Admin',
            username: username,
            email: email,
            password: hashedPassword,
            roleId: superadminRole.id,
        }).returning();

        console.log('User created successfully!');
        console.log(`Email: ${newUser[0].email}`);
        console.log(`Password: ${password}`);
    } catch (error) {
        console.error('Error creating user:', error);
    }
    process.exit(0);
}

createSuperadmin().catch(console.error);
