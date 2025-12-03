import { pgTable, text, timestamp, json, serial, integer } from 'drizzle-orm/pg-core';

/**
 * Users table schema
 * Stores user authentication and profile information
 */
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    firstname: text('firstname').notNull(),
    lastname: text('lastname').notNull(),
    password: text('password').notNull(), // Hashed with bcrypt
    roleId: integer('role_id').references(() => roles.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const roles = pgTable('roles', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description'),
    permissions: json('permissions'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const patients = pgTable('patients', {
    id: serial('id').primaryKey(),
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

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;


