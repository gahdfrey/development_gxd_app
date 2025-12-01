'use client';

import { useState, useEffect, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { User } from '@/lib/db/schema';
import Table from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import UserForm from './components/UserForm';
import { PencilSquareIcon, TrashIcon, EyeIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/app/contexts/ToastContext';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { showToast } = useToast();

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            showToast('Failed to fetch users', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (data: any) => {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            showToast(error.error || 'Failed to create user', 'error');
            throw new Error(error.error || 'Failed to create user');
        }

        await fetchUsers();
        setIsCreateModalOpen(false);
        showToast('User created successfully', 'success');
    };

    const handleUpdateUser = async (data: any) => {
        if (!selectedUser) return;

        const response = await fetch(`/api/users/${selectedUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            showToast(error.error || 'Failed to update user', 'error');
            throw new Error(error.error || 'Failed to update user');
        }

        await fetchUsers();
        setIsEditModalOpen(false);
        setSelectedUser(null);
        showToast('User updated successfully', 'success');
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        const response = await fetch(`/api/users/${selectedUser.id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            console.error('Failed to delete user');
            showToast('Failed to delete user', 'error');
            return;
        }

        await fetchUsers();
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
        showToast('User deleted successfully', 'success');
    };

    const columnHelper = createColumnHelper<User>();

    const columns = useMemo(
        () => [
            columnHelper.accessor('firstname', {
                header: 'First Name',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('lastname', {
                header: 'Last Name',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('username', {
                header: 'Username',
                cell: (info) => info.getValue(),
            }),
            columnHelper.accessor('email', {
                header: 'Email',
                cell: (info) => info.getValue(),
            }),
            columnHelper.display({
                id: 'actions',
                header: 'Actions',
                cell: (props) => (
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSelectedUser(props.row.original);
                                setIsViewModalOpen(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                            title="View"
                        >
                            <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                setSelectedUser(props.row.original);
                                setIsEditModalOpen(true);
                            }}
                            className="p-1 text-yellow-600 hover:text-yellow-800 transition-colors"
                            title="Edit"
                        >
                            <PencilSquareIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => {
                                setSelectedUser(props.row.original);
                                setIsDeleteModalOpen(true);
                            }}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ),
            }),
        ],
        []
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Create User
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <Table data={users} columns={columns} />
            )}

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New User"
            >
                <UserForm
                    onSubmit={handleCreateUser}
                    onCancel={() => setIsCreateModalOpen(false)}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                }}
                title="Edit User"
            >
                <UserForm
                    initialData={selectedUser || {}}
                    onSubmit={handleUpdateUser}
                    onCancel={() => {
                        setIsEditModalOpen(false);
                        setSelectedUser(null);
                    }}
                />
            </Modal>

            {/* View Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setSelectedUser(null);
                }}
                title="View User"
            >
                <UserForm
                    initialData={selectedUser || {}}
                    onSubmit={async () => { }}
                    onCancel={() => {
                        setIsViewModalOpen(false);
                        setSelectedUser(null);
                    }}
                    isViewMode={true}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedUser(null);
                }}
                title="Delete User"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        Are you sure you want to delete user <strong>{selectedUser?.username}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setSelectedUser(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteUser}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
