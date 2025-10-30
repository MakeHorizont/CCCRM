import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ProductionOrder, TechnologyCard, ProductionRunStep, TechnologyStep, ProductionOrderItem, EquipmentItem } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { BeakerIcon, FireIcon, BoltIcon, CheckCircleIcon, ExclamationTriangleIcon, CalculatorIcon, ChevronDownIcon, ChevronUpIcon, CogIcon } from '../UI/Icons';
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
  const [techCard, setTechCard] = useState<TechnologyCard | null>(null);
  const [productionRunSteps, setProductionRunSteps] = useState<ProductionRunStep[]>([]);
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [soyCalculatorValues, setSoyCalculatorValues] = useState<SoyCalculatorValues | null>(null);
  
  const targetOrderItem = itemToProduce; 

  useEffect(() => {
    if (!isOpen || !targetOrderItem) return;
    
    const fetchAndInitialize = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [card, equipmentData] = await Promise.all([
          apiService.getTechnologyCardByWarehouseItemId(targetOrderItem.warehouseItemId),
          apiService.getEquipmentItems({ viewMode: 'active' })
        ]);

        if (!card) {
          setError('Технологическая карта для этого продукта не найдена. Выполнение невозможно.');
          setIsLoading(false);
          return;
        }
        setTechCard(card);
        setAllEquipment(equipmentData);

        // Initialize or use existing production run steps
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
        setError(`Ошибка загрузки тех. карты: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndInitialize();
  }, [isOpen, targetOrderItem]);

  const handleStepUpdate = async (stepId: string, updates: Partial<Pick<ProductionRunStep, 'completed' | 'actualQuantity' | 'wasteQuantity' | 'notes'>>) => {
    if (!user || isSaving) return;

    const stepIndex = productionRunSteps.findIndex(s => s.stepId === stepId);
    if (stepIndex === -1) return;

    // Create a new version of the steps array for optimistic update
    const updatedSteps = [...productionRunSteps];
    const newStepState = { ...updatedSteps[stepIndex], ...updates };

    // Handle completed logic
    if (updates.completed === true) {
      newStepState.completedAt = new Date().toISOString();
      newStepState.completedBy = { userId: user.id, userName: user.name };
    } else if (updates.completed === false) {
      newStepState.completedAt = undefined;
      newStepState.completedBy = undefined;
    }
    
    updatedSteps[stepIndex] = newStepState;
    
    setIsSaving(true);
    setProductionRunSteps(updatedSteps); // Optimistic UI update

    try {
        const payload = {
            completed: newStepState.completed,
            actualQuantity: newStepState.actualQuantity,
            wasteQuantity: newStepState.wasteQuantity,
            notes: newStepState.notes,
            userId: user.id
        };
      const updatedOrder = await apiService.updateProductionRunStep(order.id, targetOrderItem.id, stepId, payload);
      // Update state from the returned order object
      const thisItem = updatedOrder.orderItems.find(i => i.id === itemToProduce.id);
      if (thisItem?.productionRun) {
           setProductionRunSteps(thisItem.productionRun.sort((a,b) => a.originalStep.order - b.originalStep.order));
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
        {error && <p className="text-red-500 text-sm p-2 bg-red-500/10 rounded-md mb-2">{error}</p>}
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center"><LoadingSpinner /></div>
        ) : !techCard ? (
          <div className="flex-grow flex items-center justify-center text-brand-text-muted">{error || 'Нет данных для отображения.'}</div>
        ) : (
          <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar-thin">
            
            {/* Calculator Section */}
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

            {/* Steps Section */}
            {productionRunSteps.map(runStep => {
                const { originalStep } = runStep;
                const equipment = originalStep.requiredEquipmentId ? allEquipment.find(e => e.id === originalStep.requiredEquipmentId) : null;
                const isEquipmentBusy = equipment && equipment.status !== 'operational' && equipment.currentProductionOrderId !== order.id;
                const isCheckboxDisabled = isSaving || isEquipmentBusy;

                const stepBaseClasses = "p-3 rounded-md border-l-4 transition-colors";
                let stepColorClass = '';
                if(runStep.completed) {
                   stepColorClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
                } else if (originalStep.type === 'safety') {
                   stepColorClass = 'border-amber-500 bg-amber-50 dark:bg-amber-900/30';
                } else {
                   stepColorClass = 'border-brand-border bg-brand-surface';
                }

                return(
                    <div key={runStep.stepId} className={`${stepBaseClasses} ${stepColorClass}`}>
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
                                {originalStep.description && <p className="text-xs text-brand-text-secondary mt-1">{originalStep.description}</p>}
                                
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
                                        <span className="text-brand-text-muted w-full sm:w-auto mb-1 sm:mb-0">План: {originalStep.plannedQuantity} {originalStep.unit}</span>
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
                                
                                 {/* Notes Textarea for all steps */}
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


                                {/* Vinegar Calculators */}
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