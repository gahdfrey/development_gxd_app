import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.firstname = (user as any).firstname;
        token.lastname = (user as any).lastname;
        token.role = (user as any).role;
        token.patientId = (user as any).patientId ?? null;
        token.organisationId = (user as any).organisationId;
        token.isPlatformAdmin = (user as any).isPlatformAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.firstname = token.firstname as string;
        session.user.lastname = token.lastname as string;
        session.user.role = token.role as string;
        session.user.patientId = (token.patientId as number | null) ?? null;
        session.user.organisationId = token.organisationId as number;
        session.user.isPlatformAdmin = token.isPlatformAdmin as boolean;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // API routes: deny by default. Only NextAuth, login/signup, and the
      // public landing-page contact form are public; everything else
      // requires a session. Individual routes still perform their own
      // org/permission checks on top of this.
      if (nextUrl.pathname.startsWith("/api")) {
        if (nextUrl.pathname.startsWith("/api/auth")) return true;
        if (nextUrl.pathname === "/api/contact") return true;
        if (isLoggedIn) return true;
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const isOnDashboard =
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/users");
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (
        isLoggedIn &&
        (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")
      ) {
        const role = ((auth?.user as any)?.role ?? "").toLowerCase();
        let landingPage = "/dashboard";
        if (role.includes("patient")) landingPage = "/my-history";
        else if (role.includes("lab")) landingPage = "/laboratory";
        else if (role.includes("radio")) landingPage = "/radiology";
        else if (role.includes("finance")) landingPage = "/finance";
        else if (role.includes("doctor")) landingPage = "/my-appointments";
        return Response.redirect(new URL(landingPage, nextUrl));
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
    // Absolute session lifetime (a working shift) — sessions expire and
    // require re-authentication after this window.
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // refresh the token at most hourly on activity
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
