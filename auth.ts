import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "./lib/auth";
import { logAudit } from "./lib/audit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await getUserByEmail(credentials.email as string);

        if (!user) {
          void logAudit({
            action: "login.failure",
            entityType: "auth",
            userEmail: credentials.email as string,
            details: { reason: "unknown_or_deactivated_user" },
          });
          return null;
        }

        const isValidPassword = await verifyPassword(
          credentials.password as string,
          user.password
        );

        if (!isValidPassword) {
          void logAudit({
            organisationId: user.organisationId,
            userId: user.id,
            userEmail: user.email,
            action: "login.failure",
            entityType: "auth",
            details: { reason: "invalid_password" },
          });
          return null;
        }

        void logAudit({
          organisationId: user.organisationId,
          userId: user.id,
          userEmail: user.email,
          action: "login.success",
          entityType: "auth",
        });

        // Return user object without password
        return {
          id: String(user.id),
          email: user.email,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          role: user.roleName || "User",
          patientId: user.patientId ?? null,
          organisationId: user.organisationId,
          isPlatformAdmin: user.isPlatformAdmin ?? false,
        };
      },
    }),
  ],
});
