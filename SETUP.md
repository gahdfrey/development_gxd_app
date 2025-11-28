# Backend Authentication Setup Guide

## Prerequisites

Before you begin, make sure you have:
1. PostgreSQL installed and running on your system
2. A PostgreSQL database created (e.g., `gxd_app`)
3. Node.js and npm installed

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env.local` file in the root directory by copying from the template:

```bash
# Copy the template
cp env-template.txt .env.local
```

Then edit `.env.local` with your actual values:

```env
# Generate a secure secret (run this command):
# openssl rand -base64 32

NEXTAUTH_SECRET=your-generated-secret-key-here
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/gxd_app
```

**Important:**
- Replace `your_username` with your PostgreSQL username
- Replace `your_password` with your PostgreSQL password
- Replace `gxd_app` with your database name if different

### 2. Create the Database

If you haven't created a PostgreSQL database yet:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE gxd_app;

# Exit psql
\q
```

### 3. Push Database Schema

Use Drizzle Kit to create the database tables:

```bash
npm run db:push
```

This will create the `users` table in your PostgreSQL database.

### 4. Verify Database Setup (Optional)

Open Drizzle Studio to view your database:

```bash
npm run db:studio
```

This will open a web interface at `https://local.drizzle.studio` where you can view your database tables and data.

### 5. Start the Development Server

```bash
npm run dev
```

## Testing the Authentication System

1. **Sign Up**: Navigate to `http://localhost:3000/signup`
   - Create a new account with username, email, and password
   - You'll be redirected to the login page after successful registration

2. **Sign In**: Navigate to `http://localhost:3000/login`
   - Log in with your email and password
   - You'll be redirected to the dashboard

3. **Dashboard**: `http://localhost:3000/dashboard`
   - This is a protected route - only accessible when logged in
   - Displays your user information
   - Has a sign out button

4. **Sign Out**: Click the "Sign Out" button on the dashboard
   - You'll be logged out and redirected to the login page

## Database Commands

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema changes directly (development)
npm run db:push

# Open Drizzle Studio (database viewer)
npm run db:studio
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Verify PostgreSQL is running: `pg_isready`
2. Check your `DATABASE_URL` in `.env.local`
3. Ensure the database exists
4. Verify your PostgreSQL credentials

### NEXTAUTH_SECRET Error

If you see "NEXTAUTH_SECRET is not set":
1. Make sure `.env.local` exists in the root directory
2. Generate a secure secret: `openssl rand -base64 32`
3. Add it to `.env.local`
4. Restart the development server

### Module Not Found Errors

If you see import errors:
1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `npm install`
3. Restart the dev server

## Production Deployment

For production:

1. **Environment Variables**: Set these in your hosting platform:
   - `NEXTAUTH_SECRET` - Generate a new secure secret
   - `NEXTAUTH_URL` - Your production domain (e.g., `https://yourdomain.com`)
   - `DATABASE_URL` - Your production PostgreSQL connection string

2. **Database**: Use a managed PostgreSQL service:
   - Vercel Postgres
   - Railway
   - Supabase
   - AWS RDS
   - Digital Ocean Managed Databases

3. **Migrations**: Run migrations before deployment:
   ```bash
   npm run db:push
   ```

4. **Security**:
   - Enable HTTPS
   - Use secure database credentials
   - Keep `NEXTAUTH_SECRET` private
   - Never commit `.env.local` to version control

## Additional Features to Implement

- Email verification
- Password reset functionality
- Two-factor authentication (2FA)
- OAuth providers (Google, GitHub, etc.)
- Role-based access control (RBAC)
- Account settings page
- Profile editing
