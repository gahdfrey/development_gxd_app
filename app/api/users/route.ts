import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { desc } from 'drizzle-orm';

export async function GET() {
    try {
        const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
        // Remove password from response
        const safeUsers = allUsers.map(({ password, ...user }) => user);
        return NextResponse.json(safeUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, email, firstname, lastname, password } = body;

        if (!username || !email || !firstname || !lastname || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await db.insert(users).values({
            username,
            email,
            firstname,
            lastname,
            password: hashedPassword,
        }).returning();

        const { password: _, ...safeUser } = newUser[0];

        return NextResponse.json(safeUser, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
