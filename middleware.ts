import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/jwt';

export async function middleware(request: NextRequest) {

    if (
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup')
    ) {
        return NextResponse.next();
    }

    const token = request.cookies.get('session')?.value;

    if (!token) {
        const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', callbackUrl);
        return NextResponse.redirect(loginUrl);
    }

    try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.next();
    } catch (err) {
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.delete('session');
        return res;
    }
}

export const config = {
    matcher: ['/dashboard/:path*', '/home/:path*', '/employees/:path*'],
};
