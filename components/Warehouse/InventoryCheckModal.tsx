
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { InventoryCheck, InventoryCheckItem, WarehouseItem } from '../../types';
import { apiService } from '../../services/apiService';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ClipboardDocumentCheckIcon, EyeIcon, EyeSlashIcon } from '../UI/Icons';

interface InventoryCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'setup' | 'count' | 'review';

const InventoryCheckModal: React.FC<InventoryCheckModalProps> = ({ isOpen, onClose, onComplete }) => {
    const [currentCheck, setCurrentCheck] = useState<InventoryCheck | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<Step>('setup');
    
    const [blindMode, setBlindMode] = useState(false);
    const [completionNotes, setCompletionNotes] = useState('');
    
    const [editedQuantities, setEditedQuantities] = useState<Record<string, string>>({});

    // Fetch active check on open
    useEffect(() => {
        if (isOpen) {
            const loadActive = async () => {
                setIsLoading(true);
                try {
                    const active = await apiService.getActiveInventoryCheck();
                    if (active) {
                        setCurrentCheck(active);
                        const initialQtys: Record<string, string> = {};
                        active.items.forEach(i => {
                            if(i.actualQuantity !== undefined) initialQtys[i.warehouseItemId] = String(i.actualQuantity);
                        });
                        setEditedQuantities(initialQtys);
                        setStep('count');
                        setBlindMode(active.blindMode || false);
                    } else {
                        setStep('setup');
                        setBlindMode(false);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            };
            loadActive();
        }
    }, [isOpen]);
    
    const handleCreate = async () => {
        setIsProcessing(true);
        try {
            const newCheck = await apiService.createInventoryCheck(blindMode);
            setCurrentCheck(newCheck);
            setStep('count');
        } catch (e: any) {
            const message = e instanceof Error ? e.message : String(e);
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleQtyChange = (itemId: string, val: string) => {
        setEditedQuantities(prev => ({...prev, [itemId]: val}));
    };
    
    const handleSaveProgress = async () => {
        if (!currentCheck) return;
        // Ideally save individually or batch. For mock, we update locally or simulate batch update.
        // We'll loop update.
        setIsProcessing(true);
        try {
            for(const [itemId, qty] of Object.entries(editedQuantities)) {
                const numQty = parseFloat(qty);
                if (!isNaN(numQty)) {
                    await apiService.updateInventoryCheckItem(currentCheck.id, itemId, numQty);
                }
            }
            // Refresh check data
            const active = await apiService.getActiveInventoryCheck();
            setCurrentCheck(active);
            alert("Прогресс сохранен.");
        } catch(e: any) {
            console.error(e);
            const message = e instanceof Error ? e.message : String(e);
            alert("Ошибка: " + message);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleGoToReview = async () => {
         if (!currentCheck) return;
         setIsProcessing(true);
         // Save first
         try {
            for(const [itemId, qty] of Object.entries(editedQuantities)) {
                const numQty = parseFloat(qty);
                if (!isNaN(numQty)) {
                    await apiService.updateInventoryCheckItem(currentCheck.id, itemId, numQty);
                }
            }
            const active = await apiService.getActiveInventoryCheck();
            setCurrentCheck(active);
            setStep('review');
         } catch (e: any) {
             const message = e instanceof Error ? e.message : String(e);
             alert("Ошибка сохранения: " + message);
         } finally {
             setIsProcessing(false);
         }
    };

    const handleComplete = async () => {
        if (!currentCheck) return;
        setIsProcessing(true);
        try {
            await apiService.completeInventoryCheck(currentCheck.id, completionNotes);
            onComplete();
            onClose();
        } catch (e: any) {
            const message = e instanceof Error ? e.message : String(e);
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleCancelCheck = async () => {
         if (!currentCheck) return;
         if(!confirm("Отменить инвентаризацию? Весь прогресс будет утерян.")) return;
         setIsProcessing(true);
         try {
             await apiService.cancelInventoryCheck(currentCheck.id);
             onClose();
         } catch (e: any) {
             const message = e instanceof Error ? e.message : String(e);
             alert(message);
         } finally {
             setIsProcessing(false);
         }
    };

    const discrepancies = useMemo(() => {
        if (!currentCheck) return [];
        return currentCheck.items.filter(i => i.actualQuantity !== undefined && i.actualQuantity !== i.expectedQuantity);
    }, [currentCheck]);

    if (isLoading) return <Modal isOpen={isOpen} onClose={onClose} title="Загрузка..."><LoadingSpinner/></Modal>;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Инвентаризация Склада" size="xl">
            {step === 'setup' && (
                <div className="space-y-6">
                    <div className="p-4 bg-brand-secondary rounded-lg border border-brand-border text-sm">
                        <p>Вы собираетесь начать инвентаризацию склада (готовой продукции). Это создаст список всех активных товаров для пересчета.</p>
                    </div>
                    
                    <div>
                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-brand-surface">
                            <input type="checkbox" checked={blindMode} onChange={e => setBlindMode(e.target.checked)} className="h-5 w-5 text-brand-primary rounded"/>
                            <div>
                                <span className="font-medium block text-brand-text-primary">Слепой метод</span>
                                <span className="text-xs text-brand-text-secondary">Скрыть ожидаемое количество (повышает честность пересчета)</span>
                            </div>
                        </label>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                        <Button variant="secondary" onClick={onClose}>Отмена</Button>
                        <Button onClick={handleCreate} isLoading={isProcessing} leftIcon={<ClipboardDocumentCheckIcon className="h-5 w-5"/>}>Начать</Button>
                    </div>
                </div>
            )}

            {step === 'count' && currentCheck && (
                <div className="flex flex-col h-[70vh]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm">
                            <p className="font-medium text-brand-text-primary">В процессе (ИД: {currentCheck.id})</p>
                            <p className="text-brand-text-muted">Метод: {currentCheck.blindMode ? 'Слепой' : 'Открытый'}</p>
                        </div>
                        <div className="space-x-2">
                            <Button size="sm" variant="secondary" onClick={handleSaveProgress} isLoading={isProcessing}>Сохранить черновик</Button>
                        </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto custom-scrollbar-thin border border-brand-border rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-brand-surface text-brand-text-secondary sticky top-0">
                                <tr>
                                    <th className="p-3">Товар</th>
                                    {!currentCheck.blindMode && <th className="p-3 text-right">Ожидается</th>}
                                    <th className="p-3 w-32 text-right">Фактически</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {currentCheck.items.map(item => (
                                    <tr key={item.warehouseItemId}>
                                        <td className="p-3">{item.warehouseItemName}</td>
                                        {!currentCheck.blindMode && <td className="p-3 text-right text-brand-text-muted">{item.expectedQuantity}</td>}
                                        <td className="p-3">
                                            <Input 
                                                id={`qty-${item.warehouseItemId}`} 
                                                type="number" 
                                                value={editedQuantities[item.warehouseItemId] || ''} 
                                                onChange={e => handleQtyChange(item.warehouseItemId, e.target.value)}
                                                className="!p-1.5 text-right"
                                                placeholder="?"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="pt-4 mt-auto flex justify-between">
                        <Button variant="danger" size="sm" onClick={handleCancelCheck} disabled={isProcessing}>Отменить</Button>
                        <div className="flex space-x-2">
                            <Button variant="secondary" onClick={onClose}>Закрыть (Продолжить позже)</Button>
                            <Button variant="primary" onClick={handleGoToReview} isLoading={isProcessing}>Перейти к сверке</Button>
                        </div>
                    </div>
                </div>
            )}

            {step === 'review' && currentCheck && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-brand-text-primary">Результаты сверки</h3>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                         <div className="p-3 bg-brand-surface rounded border border-brand-border">
                             <p className="text-brand-text-muted">Всего позиций</p>
                             <p className="text-xl font-bold">{currentCheck.items.length}</p>
                         </div>
                         <div className={`p-3 rounded border ${discrepancies.length > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                             <p className="text-brand-text-muted">Расхождений</p>
                             <p className={`text-xl font-bold ${discrepancies.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{discrepancies.length}</p>
                         </div>
                    </div>
                    
                    {discrepancies.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto border border-brand-border rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-brand-surface sticky top-0">
                                    <tr>
                                        <th className="p-2">Товар</th>
                                        <th className="p-2 text-right">Ожидалось</th>
                                        <th className="p-2 text-right">Факт</th>
                                        <th className="p-2 text-right">Разница</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {discrepancies.map(item => (
                                        <tr key={item.warehouseItemId} className="bg-red-50/50">
                                            <td className="p-2">{item.warehouseItemName}</td>
                                            <td className="p-2 text-right">{item.expectedQuantity}</td>
                                            <td className="p-2 text-right font-bold">{item.actualQuantity}</td>
                                            <td className={`p-2 text-right font-bold ${item.difference! < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {item.difference! > 0 ? '+' : ''}{item.difference}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4 bg-emerald-50 text-emerald-700 rounded text-center">
                            Расхождений не выявлено. Идеальная точность!
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-brand-text-primary mb-1">Комментарий к завершению</label>
                        <textarea 
                            value={completionNotes} 
                            onChange={e => setCompletionNotes(e.target.value)} 
                            className="w-full p-2 border border-brand-border rounded bg-brand-card"
                            rows={2}
                            placeholder="Причины расхождений, замечания..."
                        />
                    </div>
                    
                    <div className="flex justify-between pt-2">
                         <Button variant="secondary" onClick={() => setStep('count')}>Назад к подсчету</Button>
                         <Button variant="primary" onClick={handleComplete} isLoading={isProcessing}>
                            {discrepancies.length > 0 ? 'Завершить и Списать разницу' : 'Завершить успешно'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default InventoryCheckModal;