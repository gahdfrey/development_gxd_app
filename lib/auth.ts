import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * Create a new user in the database
 */
export async function createUser(data: {
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    password: string;
}) {
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Insert user into database
    const [user] = await db
        .insert(users)
        .values({
            firstname: data.firstname,
            lastname: data.lastname,
            username: data.username,
            email: data.email,
            password: hashedPassword,
        })
        .returning();

    return user;
}

/**
 * Find user by email
 */
export async function getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
}

/**
 * Find user by username
 */
export async function getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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
        errors.firstname = 'First name must be at least 2 characters';
    }

    if (!data.lastname || data.lastname.length < 2) {
        errors.lastname = 'Last name must be at least 2 characters';
    }

    if (!data.username || data.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
    }

    if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
        errors.email = 'Valid email is required';
    }

    if (!data.password || data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
        errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (data.password !== data.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}
