import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await db.select().from(users).where(eq(users.id, id));

        if (!user.length) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { password, ...safeUser } = user[0];
        return NextResponse.json(safeUser);
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { username, email, firstname, lastname, password } = body;

        const updateData: any = {
            username,
            email,
            firstname,
            lastname,
            updatedAt: new Date(),
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning();

        if (!updatedUser.length) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { password: _, ...safeUser } = updatedUser[0];
        return NextResponse.json(safeUser);
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const deletedUser = await db.delete(users).where(eq(users.id, id)).returning();

        if (!deletedUser.length) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
