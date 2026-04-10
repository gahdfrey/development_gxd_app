'use client';

import Modal from '@/app/components/ui/Modal';
import EditUserForm from './EditUserForm';
import { UserFormData } from './schema';
import { User } from '@/lib/db/schema';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSubmit: (data: UserFormData) => Promise<void>;
}

export default function EditUserModal({ isOpen, onClose, user, onSubmit }: EditUserModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User">
      {user && (
        <EditUserForm user={user} onSubmit={onSubmit} onCancel={onClose} />
      )}
    </Modal>
  );
}
