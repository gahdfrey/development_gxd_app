import * as z from 'zod';

export const userSchema = z.object({
    firstname:    z.string().min(1, 'First name is required'),
    lastname:     z.string().min(1, 'Last name is required'),
    username:     z.string().min(1, 'Username is required').min(3, 'Username must be at least 3 characters'),
    email:        z.string().min(1, 'Email is required').email('Invalid email address'),
    password:     z.string().optional(),
    roleId:       z.string().optional(),
    departmentId: z.string().optional(),
});

export type UserFormData = z.infer<typeof userSchema>;
