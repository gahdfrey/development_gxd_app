import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Users table schema
 * Stores user authentication and profile information
 */
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    firstname: text('firstname').notNull(),
    lastname: text('lastname').notNull(),
    password: text('password').notNull(), // Hashed with bcrypt
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const patients = pgTable('patients', {
    id: uuid('id').defaultRandom().primaryKey(),
    firstname: text('firstname').notNull(),
    lastname: text('lastname').notNull(),
    gender: text('gender').notNull(),
    dob: text('dob').notNull(),
    phone: text('phone').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type inference for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
