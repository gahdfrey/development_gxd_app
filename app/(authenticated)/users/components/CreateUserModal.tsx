'use client';

import Modal from '@/app/components/ui/Modal';
import CreateUserForm from './CreateUserForm';
import { NewUserPayload } from './schema';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewUserPayload) => Promise<void>;
}

export default function CreateUserModal({ isOpen, onClose, onSubmit }: CreateUserModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New User">
      <CreateUserForm onSubmit={onSubmit} onCancel={onClose} />
    </Modal>
  );
}
