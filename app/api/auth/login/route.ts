import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/auth';
import { SignJWT } from 'jose';
import { JWT_SECRET } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, rememberMe } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const user = await getUserByEmail(email);
        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // SIGN JWT
        const token = await new SignJWT({
            userId: user.id,
            email: user.email,
            username: user.username,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET);

        const maxAge = rememberMe
            ? 60 * 60 * 24 * 30
            : 60 * 60 * 24 * 7;

        // Create response
        const res = NextResponse.json(
            {
                message: 'Login successful',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                },
            },
            { status: 200 }
        );

        // SET COOKIE EXPLICITLY
        res.cookies.set({
            name: 'session',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge,
            path: '/',
        });

        return res;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

