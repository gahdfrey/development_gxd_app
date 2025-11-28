import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, getUserByUsername, validateRegistrationData } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { firstname, lastname, username, email, password, confirmPassword } = body;

        // Validate input
        const validation = validateRegistrationData({
            firstname,
            lastname,
            username,
            email,
            password,
            confirmPassword,
        });

        if (!validation.isValid) {
            return NextResponse.json(
                { error: 'Validation failed', errors: validation.errors },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUserByEmail = await getUserByEmail(email);
        if (existingUserByEmail) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        const existingUserByUsername = await getUserByUsername(username);
        if (existingUserByUsername) {
            return NextResponse.json(
                { error: 'Username is already taken' },
                { status: 409 }
            );
        }

        // Create user
        const user = await createUser({ firstname, lastname, username, email, password });

        // Return success (without password)
        return NextResponse.json(
            {
                message: 'User created successfully',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
