import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ProductionOrder, TechnologyCard, ProductionRunStep, TechnologyStep, ProductionOrderItem, EquipmentItem, HouseholdItem } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { BeakerIcon, FireIcon, BoltIcon, CheckCircleIcon, ExclamationTriangleIcon, CalculatorIcon, ChevronDownIcon, ChevronUpIcon, CogIcon, BanknotesIcon, LockClosedIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';
import SoyCalculator, { SoyCalculatorValues } from './SoyCalculator';
import VinegarCalculator from './VinegarCalculator';
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLOR_MAP } from '../../constants';


interface ProductionRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder;
  itemToProduce: ProductionOrderItem;
}

const ProductionRunModal: React.FC<ProductionRunModalProps> = ({ isOpen, onClose, order, itemToProduce }) => {
  const { user } = useAuth();
  const { systemMode } = useAppSettings();
  const [techCard, setTechCard] = useState<TechnologyCard | null>(null);
  const [productionRunSteps, setProductionRunSteps] = useState<ProductionRunStep[]>([]);
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [ingredientsStock, setIngredientsStock] = useState<Record<string, HouseholdItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [soyCalculatorValues, setSoyCalculatorValues] = useState<SoyCalculatorValues | null>(null);
  
  // State for force-enabling a blocked step (Manager Override)
  const [forceUnlockStepId, setForceUnlockStepId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  
  const targetOrderItem = itemToProduce; 
  const canOverride = user?.role === 'ceo' || user?.role === 'manager';

  useEffect(() => {
    if (!isOpen || !targetOrderItem) return;
    
    const fetchAndInitialize = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [card, equipmentData, householdData] = await Promise.all([
          apiService.getTechnologyCardByWarehouseItemId(targetOrderItem.warehouseItemId),
          apiService.getEquipmentItems({ viewMode: 'active' }),
          apiService.getHouseholdItems({ viewMode: 'active' }) // Fetch current stock
        ]);

        if (!card) {
          setError('Технологическая карта для этого продукта не найдена. Выполнение невозможно.');
          setIsLoading(false);
          return;
        }
        setTechCard(card);
        setAllEquipment(equipmentData);
        
        const stockMap: Record<string, HouseholdItem> = {};
        householdData.forEach(item => {
            stockMap[item.id] = item;
        });
        setIngredientsStock(stockMap);

        if (targetOrderItem.productionRun && targetOrderItem.productionRun.length > 0) {
          setProductionRunSteps(targetOrderItem.productionRun.sort((a,b) => a.originalStep.order - b.originalStep.order));
        } else {
          const initialSteps: ProductionRunStep[] = card.steps
            .sort((a,b) => a.order - b.order)
            .map(step => ({
              stepId: step.id,
              originalStep: { ...step },
              completed: false,
          }));
          setProductionRunSteps(initialSteps);
        }
      } catch (err) {
        setError(`Ошибка загрузки данных: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndInitialize();
  }, [isOpen, targetOrderItem]);

  const currentBatchCost = useMemo(() => {
      let cost = 0;
      productionRunSteps.forEach(step => {
          if (step.originalStep.type === 'ingredient' && step.actualQuantity) {
              const item = ingredientsStock[step.originalStep.componentId || ''];
              if (item) {
                  cost += step.actualQuantity * item.price;
              }
          }
          if ((step.originalStep.type === 'action' || step.originalStep.type === 'process') && step.completed) {
              const equipment = allEquipment.find(e => e.id === step.originalStep.requiredEquipmentId);
              if (equipment && equipment.powerKw && step.originalStep.durationMinutes) {
                  const energyUsed = (equipment.powerKw * step.originalStep.durationMinutes) / 60;
                  cost += energyUsed * 5.5;
              }
          }
      });
      return cost;
  }, [productionRunSteps, ingredientsStock, allEquipment]);


  const handleStepUpdate = async (stepId: string, updates: Partial<Pick<ProductionRunStep, 'completed' | 'actualQuantity' | 'wasteQuantity' | 'notes'>>) => {
    if (!user || isSaving) return;

    const stepIndex = productionRunSteps.findIndex(s => s.stepId === stepId);
    if (stepIndex === -1) return;
    
    if (updates.completed === true) {
        const step = productionRunSteps[stepIndex];
        if (step.originalStep.type === 'ingredient') {
            const hhItem = ingredientsStock[step.originalStep.componentId || ''];
            const needed = updates.actualQuantity || step.actualQuantity || step.originalStep.plannedQuantity || 0;
            const available = hhItem ? hhItem.quantity : 0;
            
            // Material Check Logic based on System Mode
            if (needed > available && forceUnlockStepId !== stepId) {
                if (systemMode === 'mobilization') {
                     alert(`ОШИБКА (РЕЖИМ МОБИЛИЗАЦИИ)!\n\nКритический дефицит: "${hhItem?.name}".\nНужно: ${needed} ${hhItem?.unit}\nНа складе: ${available} ${hhItem?.unit}\n\nВ режиме мобилизации работа при нехватке ресурсов запрещена. Пополните склад.`);
                     return;
                } else {
                    if (!confirm(`ПРЕДУПРЕЖДЕНИЕ!\n\nНедостаточно сырья: "${hhItem?.name}".\nНужно: ${needed} ${hhItem?.unit}\nНа складе: ${available} ${hhItem?.unit}\n\nВы уверены, что хотите списать в минус (Режим Развития)?`)) {
                        return;
                    }
                }
            }
        }
    }

    const updatedSteps = [...productionRunSteps];
    const newStepState = { ...updatedSteps[stepIndex], ...updates };

    if (updates.completed === true) {
      newStepState.completedAt = new Date().toISOString();
      newStepState.completedBy = { userId: user.id, userName: user.name };
      if (forceUnlockStepId === stepId && overrideReason) {
          newStepState.notes = (newStepState.notes ? newStepState.notes + "; " : "") + `[OVERRIDE]: ${overrideReason}`;
      }
    } else if (updates.completed === false) {
      newStepState.completedAt = undefined;
      newStepState.completedBy = undefined;
    }
    
    updatedSteps[stepIndex] = newStepState;
    
    setIsSaving(true);
    setProductionRunSteps(updatedSteps); 

    try {
        const payload = {
            completed: newStepState.completed,
            actualQuantity: newStepState.actualQuantity,
            wasteQuantity: newStepState.wasteQuantity,
            notes: newStepState.notes,
            userId: user.id
        };
      const updatedOrder = await apiService.updateProductionRunStep(order.id, targetOrderItem.id, stepId, payload);
      
      const thisItem = updatedOrder.orderItems.find(i => i.id === itemToProduce.id);
      if (thisItem?.productionRun) {
           setProductionRunSteps(thisItem.productionRun.sort((a,b) => a.originalStep.order - b.originalStep.order));
      }
      
      if (forceUnlockStepId === stepId) {
          setForceUnlockStepId(null);
          setOverrideReason('');
      }

    } catch (err) {
      setError(`Ошибка сохранения шага: ${(err as Error).message}`);
      setProductionRunSteps(productionRunSteps); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };


  const getStepIcon = (type: TechnologyStep['type']) => {
    const icons: Record<TechnologyStep['type'], React.ReactNode> = {
      ingredient: <BeakerIcon className="h-5 w-5 text-sky-400 flex-shrink-0" />,
      action: <BoltIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />,
      process: <FireIcon className="h-5 w-5 text-orange-400 flex-shrink-0" />,
      safety: <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />,
    };
    return icons[type];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Выполнение: ${itemToProduce.productName}`} size="2xl">
      <div className="max-h-[80vh] flex flex-col">
        <div className={`flex justify-between items-center p-2 rounded-md mb-2 border ${systemMode === 'mobilization' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-brand-secondary border-brand-border'}`}>
             <div className="text-xs">
                 <p>Ответственный: {order.assigneeName || 'Не назначен'}</p>
                 <p>План: {itemToProduce.plannedQuantity} {itemToProduce.unit}</p>
             </div>
             <div className="text-right">
                 <p className="text-xs opacity-70">Текущая себестоимость:</p>
                 <p className="text-lg font-bold font-mono">{currentBatchCost.toFixed(2)} ₽</p>
             </div>
        </div>

        {error && <p className="text-red-500 text-sm p-2 bg-red-500/10 rounded-md mb-2">{error}</p>}
        
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>
        ) : !techCard ? (
          <div className="flex-grow flex items-center justify-center text-brand-text-muted">{error || 'Нет данных для отображения.'}</div>
        ) : (
          <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar-thin">
            
            {/* Calculator */}
            <div className="border border-brand-border rounded-lg">
                <button
                    type="button"
                    onClick={() => setIsCalculatorOpen(prev => !prev)}
                    className="w-full flex justify-between items-center p-2 bg-brand-surface rounded-t-lg"
                >
                    <span className="flex items-center font-semibold text-brand-text-primary">
                        <CalculatorIcon className="h-5 w-5 mr-2 text-brand-primary"/>
                        Калькулятор сырья
                    </span>
                    {isCalculatorOpen ? <ChevronUpIcon className="h-5 w-5"/> : <ChevronDownIcon className="h-5 w-5"/>}
                </button>
                {isCalculatorOpen && (
                    <div className="p-3 bg-brand-card rounded-b-lg">
                        <SoyCalculator 
                            initialTempehPieces={itemToProduce.plannedQuantity}
                            onValuesChange={setSoyCalculatorValues}
                        />
                    </div>
                )}
            </div>

            {/* Steps */}
            {productionRunSteps.map(runStep => {
                const { originalStep } = runStep;
                
                const equipment = originalStep.requiredEquipmentId ? allEquipment.find(e => e.id === originalStep.requiredEquipmentId) : null;
                const isEquipmentBusy = equipment && equipment.status !== 'operational' && equipment.currentProductionOrderId !== order.id;
                
                let materialShortage = false;
                let currentStock = 0;
                let quantityNeeded = 0;
                
                if (originalStep.type === 'ingredient') {
                    const hhItem = ingredientsStock[originalStep.componentId || ''];
                    currentStock = hhItem ? hhItem.quantity : 0;
                    quantityNeeded = runStep.actualQuantity || originalStep.plannedQuantity || 0;
                    if (currentStock < quantityNeeded) {
                        materialShortage = true;
                    }
                }

                const isBlockedByMaterial = materialShortage && forceUnlockStepId !== runStep.stepId;
                const isBlockedByEquipment = isEquipmentBusy;
                
                // Strict blocking in Mobilization mode unless forced
                const isCheckboxDisabled = isSaving || isBlockedByEquipment || (isBlockedByMaterial && systemMode === 'mobilization' && !runStep.completed);

                const stepBaseClasses = "p-3 rounded-md border-l-4 transition-colors relative";
                let stepColorClass = '';
                if(runStep.completed) {
                   stepColorClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
                } else if (originalStep.type === 'safety') {
                   stepColorClass = 'border-amber-500 bg-amber-50 dark:bg-amber-900/30';
                } else {
                   stepColorClass = 'border-brand-border bg-brand-surface';
                }
                
                if (isBlockedByMaterial && !runStep.completed) {
                    stepColorClass = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                }

                return(
                    <div key={runStep.stepId} className={`${stepBaseClasses} ${stepColorClass}`}>
                        {/* Shortage Overlay */}
                        {materialShortage && !runStep.completed && (
                            <div className="absolute top-2 right-2 flex flex-col items-end space-y-1">
                                <Tooltip text={`На складе: ${currentStock} ${originalStep.unit}. Нужно: ${quantityNeeded}.`}>
                                    <span className="text-red-600 flex items-center text-xs font-bold bg-red-100 px-2 py-1 rounded border border-red-200">
                                        <ExclamationTriangleIcon className="h-4 w-4 mr-1"/>
                                        ДЕФИЦИТ
                                    </span>
                                </Tooltip>
                                
                                {canOverride && systemMode === 'mobilization' && (
                                    forceUnlockStepId !== runStep.stepId ? (
                                         <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            className="text-[10px] py-0.5 px-2 h-6 bg-white border-red-200 text-red-500 hover:bg-red-50 shadow-sm"
                                            onClick={() => setForceUnlockStepId(runStep.stepId)}
                                         >
                                            <LockClosedIcon className="h-3 w-3 mr-1"/>
                                            Override
                                         </Button>
                                    ) : (
                                        <div className="flex flex-col items-end animate-fade-in bg-white p-2 rounded shadow-lg border border-red-200 z-10">
                                            <Input 
                                                id={`reason-${runStep.stepId}`}
                                                placeholder="Причина разблокировки..."
                                                value={overrideReason}
                                                onChange={e => setOverrideReason(e.target.value)}
                                                className="text-xs mb-1 w-40"
                                            />
                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => {setForceUnlockStepId(null); setOverrideReason('');}} className="text-[10px] p-1">Отмена</Button>
                                                <span className="text-[10px] text-brand-text-muted self-center">Галочка доступна</span>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                             <input
                                type="checkbox"
                                checked={runStep.completed}
                                onChange={(e) => handleStepUpdate(runStep.stepId, { completed: e.target.checked })}
                                disabled={isCheckboxDisabled}
                                className={`mt-1 h-5 w-5 text-sky-500 border-brand-border rounded focus:ring-sky-400 bg-brand-card flex-shrink-0 ${isCheckboxDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            />
                            <div className="flex-grow">
                                <div className="flex items-center space-x-2">
                                    {getStepIcon(originalStep.type)}
                                    <h4 className={`font-medium ${runStep.completed ? 'line-through text-brand-text-muted' : 'text-brand-text-primary'} ${isCheckboxDisabled ? 'opacity-60' : ''}`}>{originalStep.name}</h4>
                                </div>
                                {originalStep.description && <p className="text-xs text-brand-text-secondary mt-1 pr-20">{originalStep.description}</p>}
                                
                                {equipment && (
                                  <div className="mt-1 text-xs text-brand-text-muted flex items-center">
                                    <CogIcon className="h-4 w-4 mr-1 text-indigo-400"/>
                                    <span>Оборудование: <strong className="text-indigo-300">{equipment.name}</strong></span>
                                     <Tooltip text={`Статус: ${EQUIPMENT_STATUS_LABELS[equipment.status!]}. ${isEquipmentBusy ? `Занято в ПЗ: ${equipment.currentProductionOrderId}` : ''}`}>
                                        <span className={`ml-2 h-2 w-2 rounded-full inline-block ${EQUIPMENT_STATUS_COLOR_MAP[equipment.status!].replace(' text-emerald-800 dark:text-emerald-200', '').replace('text-sky-800 dark:text-sky-200','').replace('text-amber-800 dark:text-amber-200','').replace('text-red-800 dark:text-red-200','')}`}></span>
                                    </Tooltip>
                                  </div>
                                )}

                                {originalStep.type === 'ingredient' && (
                                    <div className="mt-2 flex flex-wrap items-end gap-2 text-xs">
                                        <span className="text-brand-text-muted w-full sm:w-auto mb-1 sm:mb-0">
                                            План: {originalStep.plannedQuantity} {originalStep.unit}
                                            <span className={`ml-2 ${currentStock < (runStep.actualQuantity || originalStep.plannedQuantity || 0) ? 'text-red-500 font-bold' : 'text-emerald-500'}`}>
                                                (Склад: {currentStock})
                                            </span>
                                        </span>
                                        <div className="flex-grow sm:flex-grow-0 sm:w-32">
                                            <Input 
                                                id={`actual-qty-${runStep.stepId}`}
                                                type="number"
                                                label="Факт:"
                                                smallLabel
                                                defaultValue={runStep.actualQuantity || ''}
                                                onBlur={(e) => handleStepUpdate(runStep.stepId, { actualQuantity: parseFloat(e.target.value) || undefined })}
                                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {if(e.key === 'Enter') (e.target as HTMLInputElement).blur()}}
                                                disabled={isSaving}
                                                placeholder={`Кол-во (${originalStep.unit})`}
                                                className="!p-1 text-xs"
                                            />
                                        </div>
                                        <div className="flex-grow sm:flex-grow-0 sm:w-32">
                                            <Input 
                                                id={`waste-qty-${runStep.stepId}`}
                                                type="number"
                                                label="Потери:"
                                                smallLabel
                                                defaultValue={runStep.wasteQuantity || ''}
                                                onBlur={(e) => handleStepUpdate(runStep.stepId, { wasteQuantity: parseFloat(e.target.value) || undefined })}
                                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {if(e.key === 'Enter') (e.target as HTMLInputElement).blur()}}
                                                disabled={isSaving}
                                                placeholder={`Кол-во (${originalStep.unit})`}
                                                className="!p-1 text-xs"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="mt-2">
                                    <label htmlFor={`notes-${runStep.stepId}`} className="sr-only">Примечания</label>
                                    <textarea 
                                        id={`notes-${runStep.stepId}`}
                                        defaultValue={runStep.notes || ''}
                                        onBlur={(e) => handleStepUpdate(runStep.stepId, { notes: e.target.value || undefined })}
                                        placeholder="Примечания к выполнению шага..."
                                        rows={1}
                                        disabled={isSaving}
                                        className="w-full text-xs p-1.5 bg-brand-card border border-brand-border rounded-md focus:ring-1 focus:ring-sky-500 placeholder:text-brand-text-muted"
                                    />
                                </div>

                                {originalStep.id === 'process-1' && soyCalculatorValues && (
                                    <VinegarCalculator
                                        soyWeightGrams={soyCalculatorValues.boiledSoyG}
                                        vinegarType="70%"
                                        className="mt-2"
                                    />
                                )}
                                {originalStep.id === 'ingredient-1' && soyCalculatorValues && (
                                    <VinegarCalculator
                                        soyWeightGrams={soyCalculatorValues.boiledSoyG}
                                        vinegarType="9%"
                                        className="mt-2"
                                    />
                                )}

                                {runStep.completed && runStep.completedBy && (
                                     <Tooltip text={`Выполнено: ${new Date(runStep.completedAt!).toLocaleString('ru-RU')}`} position="bottom">
                                        <p className="mt-1 text-xs text-emerald-400 flex items-center">
                                            <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                                            {runStep.completedBy.userName || runStep.completedBy.userId}
                                        </p>
                                     </Tooltip>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
          </div>
        )}
         <div className="pt-4 mt-4 border-t border-brand-border flex-shrink-0 flex justify-end">
             <Button variant="secondary" onClick={onClose} disabled={isSaving}>Закрыть</Button>
         </div>
      </div>
      <style>{`.custom-scrollbar-thin::-webkit-scrollbar {width: 6px;} .custom-scrollbar-thin::-webkit-scrollbar-track {background: transparent;} .custom-scrollbar-thin::-webkit-scrollbar-thumb {background: #3f3f46; border-radius: 3px;} .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {background: #52525b;}`}</style>
    </Modal>
  );
};

export default ProductionRunModal;