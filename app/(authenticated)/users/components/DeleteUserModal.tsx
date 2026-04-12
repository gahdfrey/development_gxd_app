'use client';

import Modal from '@/app/components/ui/Modal';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | undefined;
  onDelete: () => Promise<void>;
}

export default function DeleteUserModal({ isOpen, onClose, username, onDelete }: DeleteUserModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete User">
      <div className="space-y-4">
        <p className="text-gray-600">
          Are you sure you want to delete user{' '}
          <strong>{username}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
