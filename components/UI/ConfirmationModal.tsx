import React from 'react';
import Modal from './Modal';
import Button from './Button';
import type { ButtonProps } from './Button'; // Corrected import for ButtonProps type

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode; // Can be string or JSX
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  confirmButtonVariant?: ButtonProps['variant'];
  confirmSecondaryText?: string; // New prop for third button
  onConfirmSecondary?: () => void; // New prop for third button action
  confirmSecondaryButtonVariant?: ButtonProps['variant']; // New prop for third button variant
  isConfirmDisabled?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  isLoading = false,
  confirmButtonVariant = 'danger',
  confirmSecondaryText,
  onConfirmSecondary,
  confirmSecondaryButtonVariant = 'primary',
  isConfirmDisabled = false,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {typeof message === 'string' ? (
          <p className="text-sm text-brand-text-secondary">{message}</p>
        ) : (
          message
        )}
        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          {confirmSecondaryText && onConfirmSecondary && (
            <Button
              onClick={onConfirmSecondary}
              isLoading={isLoading}
              variant={confirmSecondaryButtonVariant}
            >
              {confirmSecondaryText}
            </Button>
          )}
          <Button
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading || isConfirmDisabled}
            variant={confirmButtonVariant}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;