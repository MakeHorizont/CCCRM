import React, { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; 
  zIndex?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', zIndex = 'z-50' }) => {
  if (!isOpen) return null;

  const sizeClassesMap = { 
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-5xl', 
  };
  
  const currentSizeClass = sizeClassesMap[size] || sizeClassesMap.md;

  const modalRoot = document.getElementById('modal-portal-root');
  if (!modalRoot) {
    console.error("Modal root element with id 'modal-portal-root' not found in the DOM.");
    return null; // Or render without portal as a fallback, but fixing index.html is better.
  }

  return createPortal(
    <div 
      className={`fixed inset-0 ${zIndex} overflow-y-auto bg-black/40 dark:bg-black/70 flex items-center justify-center p-2 sm:p-4`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className={`bg-brand-card rounded-lg shadow-xl border border-brand-border text-brand-text-primary w-full ${currentSizeClass} my-auto max-h-[90vh] flex flex-col transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-brand-border flex-shrink-0">
          <h3 className="text-lg font-semibold" id="modal-title">
            {title}
          </h3>
          <button
            type="button"
            className="p-1 rounded-md text-brand-text-secondary hover:text-brand-text-primary hover:bg-zinc-100 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;