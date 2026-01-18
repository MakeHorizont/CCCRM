
import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { QrCodeIcon, PrinterIcon } from './Icons';

interface QrLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemData: {
    id: string;
    name: string;
    sku?: string;
    extra?: string;
  };
}

const QrLabelModal: React.FC<QrLabelModalProps> = ({ isOpen, onClose, itemData }) => {
  const handlePrint = () => {
    window.print(); // Basic system print
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Паспорт материальной единицы" size="md">
      <div className="flex flex-col items-center p-4">
        {/* Printable Label Section */}
        <div id="printable-label" className="w-full max-w-[300px] aspect-[3/4] bg-white border-2 border-black p-4 flex flex-col items-center justify-between text-black shadow-lg mb-6 print:shadow-none print:m-0">
          <div className="text-center w-full">
            <p className="text-[10px] font-black uppercase tracking-widest border-b border-black pb-1 mb-2">CCCRM PROPERTY</p>
            <p className="text-sm font-bold leading-tight line-clamp-2">{itemData.name}</p>
            {itemData.sku && <p className="text-[10px] font-mono mt-1">SKU: {itemData.sku}</p>}
          </div>

          <div className="w-40 h-40 bg-zinc-100 flex items-center justify-center border border-zinc-300 relative">
             <QrCodeIcon className="w-32 h-32 opacity-80" />
             <div className="absolute inset-0 flex items-center justify-center">
                 <p className="text-[8px] font-mono bg-white px-1 border border-black">{itemData.id}</p>
             </div>
          </div>

          <div className="w-full text-center">
            <p className="text-[8px] font-medium uppercase text-zinc-500">Дата генерации</p>
            <p className="text-[10px] font-bold">{new Date().toLocaleDateString('ru-RU')} {new Date().toLocaleTimeString('ru-RU')}</p>
            {itemData.extra && <p className="text-[9px] mt-1 italic">{itemData.extra}</p>}
          </div>
        </div>

        <div className="w-full space-y-2">
            <Button onClick={handlePrint} fullWidth leftIcon={<PrinterIcon className="h-5 w-5"/>}>Отправить на печать</Button>
            <p className="text-[10px] text-brand-text-muted text-center italic">
                Наклейте этот паспорт на контейнер или мешок. С этого момента единица становится частью контролируемого контура.
            </p>
            <Button variant="ghost" fullWidth onClick={onClose}>Закрыть</Button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-label, #printable-label * { visibility: visible; }
          #printable-label {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            border: none;
          }
        }
      `}</style>
    </Modal>
  );
};

export default QrLabelModal;
