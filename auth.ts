import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "./lib/auth";
import { logAudit } from "./lib/audit";
import { db } from "./lib/db";
import { auditLogs } from "./lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

// Failed-login lockout: after LOCKOUT_THRESHOLD failures for an email within
// LOCKOUT_WINDOW_MS, further attempts are blocked until the window elapses.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

async function recentLoginFailures(email: string): Promise<number> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.userEmail, email),
        eq(auditLogs.action, "login.failure"),
        gte(auditLogs.createdAt, since),
      ),
    );
  return row?.n ?? 0;
}

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

        const email = credentials.email as string;

        // Lockout / backoff: block if too many recent failures for this email.
        if ((await recentLoginFailures(email)) >= LOCKOUT_THRESHOLD) {
          void logAudit({
            action: "login.lockout",
            entityType: "auth",
            userEmail: email,
            details: { reason: "too_many_failed_attempts", windowMinutes: 15 },
          });
          return null;
        }

        const user = await getUserByEmail(email);

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
