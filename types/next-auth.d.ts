import NextAuth from 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        username: string;
        firstname: string;
        lastname: string;
        role: string;
        patientId?: number | null;
        organisationId: number;
        isPlatformAdmin: boolean;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            username: string;
            firstname: string;
            lastname: string;
            role: string;
            patientId?: number | null;
            organisationId: number;
            isPlatformAdmin: boolean;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        username: string;
        firstname: string;
        lastname: string;
        role: string;
        patientId?: number | null;
        organisationId: number;
        isPlatformAdmin: boolean;
    }
}
