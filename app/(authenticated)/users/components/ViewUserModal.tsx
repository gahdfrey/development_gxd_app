'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { User } from '@/lib/db/schema';

interface ViewUserModalProps {
    userId: number;
    onClose: () => void;
}

type UserWithRole = User & { roleName: string | null };

export default function ViewUserModal({ userId, onClose }: ViewUserModalProps) {
    const { data: userData, isLoading } = useSWR<UserWithRole>(
        userId ? `/api/users/${userId}` : null,
        fetcher
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-600">User not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                        {userData.firstname || '-'}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                        {userData.lastname || '-'}
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                    {userData.username || '-'}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                    {userData.email || '-'}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                    {userData.roleName || 'N/A'}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Close
                </button>
            </div>
        </div>
    );
}
