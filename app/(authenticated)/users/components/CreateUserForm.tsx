'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { userSchema, UserFormData } from './schema';

interface CreateUserFormProps {
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
}

export default function CreateUserForm({ onSubmit, onCancel }: CreateUserFormProps) {
    const [showPassword, setShowPassword] = useState(false);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstname: '',
            lastname: '',
            username: '',
            email: '',
            password: '',
            roleId: '',
        },
    });

    const { data: roles = [] } = useSWR<{ id: number; name: string }[]>('/api/roles', fetcher);

    const onFormSubmit = async (data: UserFormData) => {
        if (!data.password) {
            setError('password', { type: 'manual', message: 'Password is required for new users' });
            return;
        }

        if (data.password.length < 8) {
            setError('password', { type: 'manual', message: 'Password must be at least 8 characters' });
            return;
        }

        try {
            const formattedData = {
                ...data,
                roleId: data.roleId ? parseInt(data.roleId) : null,
            };
            await onSubmit(formattedData);
        } catch (err: any) {
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                    </label>
                    <input
                        type="text"
                        {...register('firstname')}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.firstname ? 'border-red-500' : 'border-gray-300'}
                            }`}
                    />
                    {errors.firstname && <p className="mt-1 text-xs text-red-500">{errors.firstname.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                    </label>
                    <input
                        type="text"
                        {...register('lastname')}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.lastname ? 'border-red-500' : 'border-gray-300'}
                            }`}
                    />
                    {errors.lastname && <p className="mt-1 text-xs text-red-500">{errors.lastname.message}</p>}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                </label>
                <input
                    type="text"
                    {...register('username')}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.username ? 'border-red-500' : 'border-gray-300'}
                        }`}
                />
                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                </label>
                <input
                    type="email"
                    {...register('email')}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}
                        }`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                </label>
                <select
                    {...register('roleId')}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.roleId ? 'border-red-500' : 'border-gray-300'}
                        }`}
                >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.name}
                        </option>
                    ))}
                </select>
                {errors.roleId && <p className="mt-1 text-xs text-red-500">{errors.roleId.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                </label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-10 ${errors.password ? 'border-red-500' : 'border-gray-300'}
                            }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                        {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                        ) : (
                            <EyeIcon className="h-5 w-5" aria-hidden="true" />
                        )}
                    </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
            </div>
        </form>
    );
}
