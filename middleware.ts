import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    // NOTE: /api is intentionally included so every API route is
    // authenticated by default (defense in depth — see authorized() in
    // auth.config.ts). Only /api/auth/* stays public.
    matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};
