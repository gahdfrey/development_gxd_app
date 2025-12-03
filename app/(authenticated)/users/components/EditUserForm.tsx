'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { User } from '@/lib/db/schema';
import { userSchema, UserFormData } from './schema';

interface EditUserFormProps {
    userId: number;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    isViewMode?: boolean;
}

export default function EditUserForm({ userId, onSubmit, onCancel, isViewMode = false }: EditUserFormProps) {
    const [showPassword, setShowPassword] = useState(false);
    const {
        register,
        handleSubmit,
        reset,
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
    const { data: userData, isLoading: isUserLoading } = useSWR<User>(
        userId ? `/api/users/${userId}` : null,
        fetcher
    );

    useEffect(() => {
        if (userData) {
            reset({
                firstname: userData.firstname || '',
                lastname: userData.lastname || '',
                username: userData.username || '',
                email: userData.email || '',
                password: '', // Password is never pre-filled
                roleId: userData.roleId ? String(userData.roleId) : '',
            });
        }
    }, [userData, reset]);

    const onFormSubmit = async (data: UserFormData) => {
        if (data.password && data.password.length < 8) {
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

    if (isUserLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name
                    </label>
                    <input
                        type="text"
                        {...register('firstname')}
                        disabled={isViewMode}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60 ${errors.firstname ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                    />
                    {errors.firstname && <p className="mt-1 text-xs text-red-500">{errors.firstname.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name
                    </label>
                    <input
                        type="text"
                        {...register('lastname')}
                        disabled={isViewMode}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60 ${errors.lastname ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                    />
                    {errors.lastname && <p className="mt-1 text-xs text-red-500">{errors.lastname.message}</p>}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username
                </label>
                <input
                    type="text"
                    {...register('username')}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60 ${errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                />
                {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                </label>
                <input
                    type="email"
                    {...register('email')}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60 ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                </label>
                <select
                    {...register('roleId')}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-60 ${errors.roleId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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

            {!isViewMode && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        New Password (leave blank to keep current)
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            {...register('password')}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10 ${errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
            )}

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                    {isViewMode ? 'Close' : 'Cancel'}
                </button>
                {!isViewMode && (
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Saving...' : 'Update User'}
                    </button>
                )}
            </div>
        </form>
    );
}
