import bcrypt from "bcryptjs";
import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/**
 * Create the patient-portal login for a patient. Patients sign in with their
 * email (default password "Password1"); the username is firstname.lastname,
 * with the patient id appended when that's already taken in the facility.
 */
export async function createPatientPortalAccount(
  exec: Executor,
  p: { orgId: number; patientId: number; firstname: string; lastname: string; email: string },
) {
  const baseUsername = `${p.firstname.toLowerCase().trim()}.${p.lastname.toLowerCase().trim()}`;
  const [patientRole, existingUsername, hashedPassword] = await Promise.all([
    exec.select({ id: roles.id }).from(roles)
      .where(and(ilike(roles.name, "patient"), eq(roles.organisationId, p.orgId)))
      .limit(1).then(r => r[0]),
    exec.select({ id: users.id }).from(users)
      .where(and(eq(users.username, baseUsername), eq(users.organisationId, p.orgId)))
      .limit(1).then(r => r[0]),
    bcrypt.hash("Password1", 10),
  ]);

  const username = existingUsername ? `${baseUsername}${p.patientId}` : baseUsername;

  await exec.insert(users).values({
    organisationId: p.orgId,
    firstname: p.firstname,
    lastname: p.lastname,
    username,
    email: p.email,
    password: hashedPassword,
    roleId: patientRole?.id ?? null,
    patientId: p.patientId,
  });
}
