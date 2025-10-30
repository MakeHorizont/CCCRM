import React, { useState, useEffect, useMemo } from 'react';
import { Order, WarehouseItem, StorageLocation } from '../../types';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import ConfirmationModal from '../UI/ConfirmationModal';

interface AssemblyModalProps {
  order: Order;
  warehouseItems: WarehouseItem[];
  storageLocations: StorageLocation[];
  onClose: () => void;
  onCompleteAssembly: (orderId: string, locationId: string | null) => void;
  isInteractionLoading: boolean;
}

const AssemblyModal: React.FC<AssemblyModalProps> = ({ order, warehouseItems, storageLocations, onClose, onCompleteAssembly, isInteractionLoading }) => {
    const [assembledItems, setAssembledItems] = useState<Record<string, boolean>>({});
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [assembleConfirmInput, setAssembleConfirmInput] = useState('');

    useEffect(() => {
        const initialAssemblyStatus = order.items.reduce((acc, item) => {
            acc[item.id] = item.isAssembled;
            return acc;
        }, {} as Record<string, boolean>);
        setAssembledItems(initialAssemblyStatus);
    }, [order]);

    const handleToggleItem = (itemId: string) => {
        setAssembledItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const allItemsAssembled = useMemo(() => {
        return order.items.every(item => assembledItems[item.id]);
    }, [order.items, assembledItems]);

    const handleSubmit = () => {
        setIsConfirmOpen(true);
    };

    const handleConfirm = () => {
        setIsConfirmOpen(false);
        onCompleteAssembly(order.id, selectedLocationId);
    };


    return (
        <>
        <Modal isOpen={true} onClose={onClose} title={`Сборка заказа #${order.id}`} size="xl">
            <div className="space-y-4">
                <p className="text-sm text-brand-text-secondary">Отметьте собранные позиции. После завершения укажите место хранения собранной коробки.</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar-thin">
                    {order.items.map(item => {
                        const whItem = warehouseItems.find(wh => wh.id === item.productId);
                        return (
                            <div key={item.id} className={`flex items-center justify-between p-2 rounded-md border ${assembledItems[item.id] ? 'bg-emerald-900/50 border-emerald-700' : 'bg-brand-surface border-brand-border'}`}>
                                <div className="flex-grow">
                                    <p className="font-medium text-brand-text-primary">{item.productName}</p>
                                    <p className="text-xs text-brand-text-muted">Нужно: {item.quantity} шт. | На складе: {whItem?.quantity || 0} шт. | Расположение: {whItem?.locationName || '-'}</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={assembledItems[item.id] || false}
                                    onChange={() => handleToggleItem(item.id)}
                                    className="h-5 w-5 text-sky-500 border-brand-border rounded focus:ring-sky-400 cursor-pointer ml-4"
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="pt-4 border-t border-brand-border">
                    <label htmlFor="storage-location-select" className="block text-sm font-medium text-brand-text-primary mb-1">Место хранения собранного заказа</label>
                    <select
                        id="storage-location-select"
                        value={selectedLocationId || ''}
                        onChange={(e) => setSelectedLocationId(e.target.value || null)}
                        className="w-full md:w-1/2 bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500"
                    >
                        <option value="">Не указывать</option>
                        {storageLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-3 pt-3">
                    <Button variant="secondary" onClick={onClose}>Отмена</Button>
                    <Button onClick={handleSubmit} disabled={!allItemsAssembled || isInteractionLoading} isLoading={isInteractionLoading}>
                        Завершить сборку
                    </Button>
                </div>
            </div>
        </Modal>
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => {
                setIsConfirmOpen(false);
                setAssembleConfirmInput('');
            }}
            onConfirm={handleConfirm}
            title="Подтверждение завершения сборки"
            message={
                <div className="space-y-3 text-sm">
                    <p>Вы уверены, что все позиции собраны и заказ готов к отправке.</p>
                    <p className="p-2 bg-orange-500/10 text-orange-400 rounded-md">
                        <strong className="font-semibold">Внимание:</strong> Все товары из заказа будут списаны со склада. Это действие нельзя отменить.
                    </p>
                    <p>Для подтверждения, введите слово <strong className="font-mono text-orange-400">собран</strong> в поле ниже:</p>
                    <Input
                        id="assembly-modal-confirm"
                        type="text"
                        value={assembleConfirmInput}
                        onChange={(e) => setAssembleConfirmInput(e.target.value.toLowerCase())}
                        autoFocus
                    />
                </div>
            }
            confirmText="Да, завершить"
            isConfirmDisabled={assembleConfirmInput !== 'собран'}
            isLoading={isInteractionLoading}
        />
      </>
    );
};

export default AssemblyModal;