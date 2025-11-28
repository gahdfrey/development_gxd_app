import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { redirect } from 'next/navigation';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'default-secret-key-change-in-production'
);

export type SessionUser = {
    id: string;
    email: string;
    username: string;
};

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;

    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return {
            id: payload.userId as string,
            email: payload.email as string,
            username: payload.username as string,
        };
    } catch (error) {
        return null;
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    redirect('/login');
}
