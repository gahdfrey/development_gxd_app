
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { users, roles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
    try {
        const session = await auth();

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userDetails = await db.select({
            id: users.id,
            firstname: users.firstname,
            lastname: users.lastname,
            username: users.username,
            roleId: users.roleId,
            userrole: roles.name,
            permissions: roles.permissions,
        })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id))
            .where(eq(users.email, session.user.email))
            .limit(1);

        if (userDetails.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = userDetails[0];

        return NextResponse.json({
            id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            userrole: user.userrole,
            roleId: user.roleId,
            permissions: user.permissions,
        });

    } catch (error) {
        console.error('Error fetching user details:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
