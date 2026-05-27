import { auth, signOut } from '@/auth';

export type SessionUser = {
    id: string;
    email: string;
    username: string;
    firstname?: string;
    lastname?: string;
    organisationId: number;
};

export async function getSession(): Promise<SessionUser | null> {
    const session = await auth();

    if (!session?.user) {
        return null;
    }

    return {
        id: session.user.id as string,
        email: session.user.email as string,
        username: session.user.username as string,
        firstname: session.user.firstname as string,
        lastname: session.user.lastname as string,
        organisationId: session.user.organisationId as number,
    };
}

export async function logout() {
    await signOut({ redirectTo: '/login' });
}
