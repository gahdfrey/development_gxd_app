
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roles } from '@/lib/db/schema';

export async function GET() {
    try {
        const allRoles = await db.select().from(roles);
        return NextResponse.json(allRoles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }
}
