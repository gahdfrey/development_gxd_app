import { db } from "./db";
import { users, roles } from "./db/schema";
import { and, eq, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Create a new user in the database
 */
export async function createUser(data: {
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password: string;
  organisationId: number;
  roleId?: number;
}) {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      firstname: data.firstname,
      lastname: data.lastname,
      username: data.username,
      email: data.email,
      password: hashedPassword,
      organisationId: data.organisationId,
      roleId: data.roleId || null,
    })
    .returning();

  return user;
}

/**
 * Find user by email with role name
 */
export async function getUserByEmail(email: string) {
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      firstname: users.firstname,
      lastname: users.lastname,
      password: users.password,
      roleId: users.roleId,
      patientId: users.patientId,
      organisationId: users.organisationId,
      isPlatformAdmin: users.isPlatformAdmin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      roleName: roles.name,
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);

  if (result.length === 0) return undefined;

  return result[0];
}

/**
 * Find user by username
 */
export async function getUserByUsername(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  return user;
}

/**
 * Verify user password
 */
export async function verifyPassword(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Validate user registration data
 */
export function validateRegistrationData(data: {
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}) {
  const errors: Record<string, string> = {};

  if (!data.firstname || data.firstname.length < 2) {
    errors.firstname = "First name must be at least 2 characters";
  }

  if (!data.lastname || data.lastname.length < 2) {
    errors.lastname = "Last name must be at least 2 characters";
  }

  if (!data.username || data.username.length < 3) {
    errors.username = "Username must be at least 3 characters";
  }

  if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = "Valid email is required";
  }

  if (!data.password || data.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
    errors.password = "Password must contain uppercase, lowercase, and number";
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
