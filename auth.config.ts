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
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
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
        else if (role.includes("radio")) landingPage = "/radiography";
        else if (role.includes("finance")) landingPage = "/finance";
        else if (role.includes("doctor")) landingPage = "/my-appointments";
        return Response.redirect(new URL(landingPage, nextUrl));
      }
      return true;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
