-- Drop existing tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Create roles table with serial ID
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create users table with serial ID
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    password TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create patients table with serial ID
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    gender TEXT NOT NULL,
    dob TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
