import React from 'react';
import Modal from './UI/Modal';
import Button from './UI/Button';
import { useView } from '../hooks/useView';
import { XMarkIcon, LockClosedIcon, LockOpenIcon, ArrowPathIcon as ResetIcon } from './UI/Icons'; // Added ResetIcon
import { MobileNavItemConfig, IconComponents } from '../constants';

interface MobileNavSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNavSettingsModal: React.FC<MobileNavSettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    mobileNavItemsConfig, 
    setMobileNavItemsConfig, 
    isMobileNavLocked, 
    toggleMobileNavLock,
    resetMobileNavSettings
  } = useView();

  const handleVisibilityChange = (itemId: string, isVisible: boolean) => {
    const newConfig = mobileNavItemsConfig.map(item => 
      item.id === itemId ? { ...item, isVisible } : item
    );
    setMobileNavItemsConfig(newConfig);
  };

  const handleReset = () => {
    if (window.confirm("Вы уверены, что хотите сбросить все настройки мобильного меню (порядок и видимость) к значениям по умолчанию?")) {
        resetMobileNavSettings();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Настройки мобильного меню" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-2 bg-brand-surface rounded-md">
          <span className="text-sm font-medium text-brand-text-primary">Заблокировать порядок кнопок</span>
          <Button onClick={toggleMobileNavLock} variant="ghost" size="sm" 
                  leftIcon={isMobileNavLocked ? <LockClosedIcon className="h-5 w-5 text-red-400"/> : <LockOpenIcon className="h-5 w-5 text-emerald-400"/>}
          >
            {isMobileNavLocked ? 'Заблокировано' : 'Разблокировано'}
          </Button>
        </div>

        <h4 className="text-md font-semibold text-brand-text-primary pt-2 border-t border-brand-border">Видимость пунктов меню:</h4>
        <div className="max-h-60 overflow-y-auto space-y-1 pr-2 custom-scrollbar-thin">
          {mobileNavItemsConfig.map((item) => {
            const IconComponent = IconComponents[item.iconName as keyof typeof IconComponents] || IconComponents.DocumentIcon;
            return (
            <div key={item.id} className="flex items-center justify-between p-2 hover:bg-brand-surface rounded-md">
              <div className="flex items-center">
                <IconComponent className="h-5 w-5 mr-2 text-brand-text-secondary"/>
                <span className="text-sm text-brand-text-primary">{item.label}</span>
              </div>
              <input
                type="checkbox"
                checked={item.isVisible}
                onChange={(e) => handleVisibilityChange(item.id, e.target.checked)}
                className="h-4 w-4 text-sky-500 border-brand-border rounded focus:ring-sky-400 cursor-pointer"
                aria-label={`Показать/скрыть ${item.label}`}
              />
            </div>
          )})}
        </div>

        <div className="pt-4 border-t border-brand-border flex justify-between items-center">
          <Button onClick={handleReset} variant="danger" size="sm" leftIcon={<ResetIcon className="h-4 w-4"/>}>
            Сбросить настройки
          </Button>
          <Button onClick={onClose} variant="primary">
            Закрыть
          </Button>
        </div>
      </div>
       <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </Modal>
  );
};

export default MobileNavSettingsModal;