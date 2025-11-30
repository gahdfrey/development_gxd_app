import NextAuth from 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        username: string;
        firstname: string;
        lastname: string;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            username: string;
            firstname: string;
            lastname: string;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        username: string;
        firstname: string;
        lastname: string;
    }
}
