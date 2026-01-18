
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '../UI/Modal';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import { ProductionOrder, TechnologyCard, ProductionRunStep, TechnologyStep, ProductionOrderItem, EquipmentItem, HouseholdItem } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { useAppSettings } from '../../hooks/useAppSettings';
import { BeakerIcon, FireIcon, BoltIcon, CheckCircleIcon, ExclamationTriangleIcon, CalculatorIcon, ChevronDownIcon, ChevronUpIcon, CogIcon, LockClosedIcon, ShieldCheckIcon, HandRaisedIcon, QrCodeIcon, ChartPieIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';
import SoyCalculator, { SoyCalculatorValues } from './SoyCalculator';
import VinegarCalculator from './VinegarCalculator';
import ScannerModal from '../UI/ScannerModal';

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
  const [ingredientsStock, setIngredientsStock] = useState<Record<string, HouseholdItem>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Anomaly & Loss State
  const [showAnomalyForm, setShowAnomalyForm] = useState<string | null>(null); // stepId
  const [anomalyJustification, setAnomalyJustification] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<{id: string, data: Partial<ProductionRunStep>} | null>(null);

  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScanStepId, setActiveScanStepId] = useState<string | null>(null);

  // Emergency Breakthrough state
  const [showBreachForm, setShowBreachForm] = useState<string | null>(null); // stepId
  const [breachJustification, setBreachJustification] = useState('');

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [soyCalculatorValues, setSoyCalculatorValues] = useState<SoyCalculatorValues | null>(null);
  
  useEffect(() => {
    if (!isOpen || !itemToProduce) return;
    
    const fetchAndInitialize = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [card, householdData] = await Promise.all([
          apiService.getTechnologyCardByWarehouseItemId(itemToProduce.warehouseItemId),
          apiService.getHouseholdItems({ viewMode: 'active' })
        ]);

        if (!card) {
          setError('Технологическая карта не найдена.');
          setIsLoading(false);
          return;
        }
        setTechCard(card);
        
        const stockMap: Record<string, HouseholdItem> = {};
        householdData.forEach(item => stockMap[item.id] = item);
        setIngredientsStock(stockMap);

        if (itemToProduce.productionRun && itemToProduce.productionRun.length > 0) {
          setProductionRunSteps(itemToProduce.productionRun.sort((a,b) => a.originalStep.order - b.originalStep.order));
        } else {
          setProductionRunSteps(card.steps.sort((a,b) => a.order - b.order).map(step => ({
              stepId: step.id,
              originalStep: { ...step },
              completed: false,
          })));
        }
      } catch (err) {
        setError(`Ошибка: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndInitialize();
  }, [isOpen, itemToProduce]);

  const handleStepUpdate = async (stepId: string, updates: Partial<ProductionRunStep>, isAuthorized = false) => {
    if (!user || isSaving) return;

    const stepIndex = productionRunSteps.findIndex(s => s.stepId === stepId);
    if (stepIndex === -1) return;
    
    const step = productionRunSteps[stepIndex];

    // LEAN VALIDATION: Check for losses or waste
    const hasWaste = (updates.wasteQuantity || 0) > 0;
    const isOverConsumption = updates.actualQuantity && updates.actualQuantity > (step.originalStep.plannedQuantity || 0) * 1.05;

    if ((hasWaste || isOverConsumption) && !isAuthorized) {
        setPendingUpdate({ id: stepId, data: updates });
        setShowAnomalyForm(stepId);
        return;
    }

    // MATERIAL VALIDATION (Mobilization)
    if (updates.completed === true && step.originalStep.type === 'ingredient' && !isAuthorized) {
        const hhItem = ingredientsStock[step.originalStep.componentId || ''];
        const needed = updates.actualQuantity || step.originalStep.plannedQuantity || 0;
        const available = hhItem ? (hhItem.quantity - (hhItem.reservedQuantity || 0)) : 0;
        
        if (needed > available && systemMode === 'mobilization') {
            setShowBreachForm(stepId);
            return;
        }
    }

    const updatedSteps = [...productionRunSteps];
    const newStepState = { ...updatedSteps[stepIndex], ...updates };

    if (updates.completed === true) {
      newStepState.completedAt = new Date().toISOString();
      newStepState.completedBy = { userId: user.id, userName: user.name };
      
      if (isAuthorized) {
          const reason = anomalyJustification || breachJustification;
          newStepState.notes = `[ФИКСАЦИЯ ПОТЕРЬ] ${reason}. ${newStepState.notes || ''}`;
          
          // Auto-register Incident for losses
          if (hasWaste || isOverConsumption) {
              apiService.addIncident({
                  warehouseItemId: itemToProduce.warehouseItemId,
                  userId: user.id,
                  type: 'defect',
                  description: `ПЗ #${order.id}: Потери на шаге "${step.originalStep.name}". Причина: ${reason}`
              });
          }
      }
    }
    
    updatedSteps[stepIndex] = newStepState;
    setIsSaving(true);
    try {
      await apiService.updateProductionRunStep(order.id, itemToProduce.id, stepId, {
          ...updates,
          notes: newStepState.notes,
          userId: user.id
      });
      setProductionRunSteps(updatedSteps);
      setShowBreachForm(null);
      setShowAnomalyForm(null);
      setBreachJustification('');
      setAnomalyJustification('');
      setPendingUpdate(null);
    } catch (err) {
      setError(`Ошибка: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const openScannerForStep = (stepId: string) => {
      setActiveScanStepId(stepId);
      setIsScannerOpen(true);
  };

  const handleScanResult = (code: string) => {
      if (!activeScanStepId) return;
      const step = productionRunSteps.find(s => s.stepId === activeScanStepId);
      if (!step) return;

      const targetSku = step.originalStep.componentId;
      if (code === targetSku) {
          handleStepUpdate(activeScanStepId, { completed: true, notes: '[Verified by Scanner]' });
          setIsScannerOpen(false);
          setActiveScanStepId(null);
      } else {
          alert(`Неверная метка! Ожидалось: ${targetSku}, отсканировано: ${code}. Проверьте партию сырья!`);
      }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={`Цех: ${itemToProduce.productName}`} size="2xl">
      <div className="max-h-[80vh] flex flex-col space-y-4">
        
        <div className="p-3 rounded-lg border border-brand-border bg-brand-surface flex justify-between items-center shadow-inner">
            <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 text-indigo-500"/>
                <div>
                    <p className="text-[10px] font-black uppercase text-brand-text-muted">Контактный контроль</p>
                    <p className="text-sm font-bold text-brand-text-primary">Цикл верифицирован</p>
                </div>
            </div>
            <div className={`px-3 py-1 rounded text-xs font-bold ${systemMode === 'mobilization' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                {systemMode.toUpperCase()}
            </div>
        </div>

        {isLoading ? <LoadingSpinner /> : (
            <div className="overflow-y-auto space-y-4 pr-2 custom-scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Card className="!p-3 border-sky-500/20">
                        <button onClick={() => setIsCalculatorOpen(!isCalculatorOpen)} className="w-full flex justify-between items-center text-sm font-bold text-sky-600">
                            <span className="flex items-center"><CalculatorIcon className="h-4 w-4 mr-2"/> Калькулятор сои</span>
                            {isCalculatorOpen ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
                        </button>
                        {isCalculatorOpen && <div className="mt-4"><SoyCalculator initialTempehPieces={itemToProduce.plannedQuantity} onValuesChange={setSoyCalculatorValues} /></div>}
                    </Card>
                    <Card className="!p-3 border-amber-500/20">
                        <p className="text-sm font-bold text-amber-600 mb-2 flex items-center"><BeakerIcon className="h-4 w-4 mr-2"/> Расчет уксуса</p>
                        <VinegarCalculator soyWeightGrams={soyCalculatorValues?.boiledSoyG || 0} vinegarType="70%" />
                    </Card>
                </div>

                <div className="space-y-2">
                    {productionRunSteps.map(runStep => {
                        const isIngredient = runStep.originalStep.type === 'ingredient';
                        const hhItem = isIngredient ? ingredientsStock[runStep.originalStep.componentId || ''] : null;
                        const available = hhItem ? (hhItem.quantity - (hhItem.reservedQuantity || 0)) : 0;
                        const isShort = isIngredient && available < (runStep.originalStep.plannedQuantity || 0);

                        return (
                            <div key={runStep.stepId} className={`p-3 rounded-lg border-l-4 transition-all ${runStep.completed ? 'border-emerald-500 bg-emerald-500/5' : isShort ? 'border-red-500 bg-red-500/5' : 'border-brand-border bg-brand-card'}`}>
                                <div className="flex items-start gap-4">
                                    {!runStep.completed && isIngredient ? (
                                        <button 
                                            onClick={() => openScannerForStep(runStep.stepId)}
                                            className="mt-1 h-10 w-10 flex items-center justify-center bg-sky-500 text-white rounded-lg shadow-md hover:bg-sky-400 active:scale-95 transition-all"
                                            title="Сканировать материал"
                                        >
                                            <QrCodeIcon className="h-6 w-6"/>
                                        </button>
                                    ) : (
                                        <input 
                                            type="checkbox" 
                                            checked={runStep.completed} 
                                            onChange={e => handleStepUpdate(runStep.stepId, { completed: e.target.checked })}
                                            disabled={isSaving}
                                            className="mt-1 h-6 w-6 text-sky-500 rounded border-brand-border cursor-pointer disabled:opacity-30"
                                        />
                                    )}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className={`font-bold text-sm ${runStep.completed ? 'line-through text-brand-text-muted' : 'text-brand-text-primary'}`}>
                                                {runStep.originalStep.name}
                                            </h4>
                                            {isShort && !runStep.completed && (
                                                <span className="text-[10px] font-black text-red-500 flex items-center flex-shrink-0">
                                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1"/> ДЕФИЦИТ
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="mt-2 flex flex-wrap gap-4 items-center">
                                            {isIngredient && !runStep.completed && (
                                                <div className="flex items-center gap-2 text-[10px] font-mono">
                                                    <span className="text-brand-text-muted">Норма: {runStep.originalStep.plannedQuantity} {runStep.originalStep.unit}</span>
                                                    <span className={isShort ? 'text-red-500 font-bold' : 'text-emerald-500'}>Свободно: {available.toFixed(2)}</span>
                                                </div>
                                            )}
                                            
                                            {!runStep.completed && (
                                                <div className="flex items-center gap-2">
                                                    <Input 
                                                        id={`actual-qty-${runStep.stepId}`} 
                                                        type="number" 
                                                        placeholder="Факт" 
                                                        className="!py-1 !px-2 w-20 text-xs" 
                                                        onChange={e => setPendingUpdate({ id: runStep.stepId, data: { actualQuantity: parseFloat(e.target.value) } })}
                                                    />
                                                    <Input 
                                                        id={`waste-qty-${runStep.stepId}`} 
                                                        type="number" 
                                                        placeholder="Брак" 
                                                        className="!py-1 !px-2 w-20 text-xs border-red-300 text-red-600" 
                                                        onChange={e => setPendingUpdate({ id: runStep.stepId, data: { wasteQuantity: parseFloat(e.target.value) } })}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {showAnomalyForm === runStep.stepId && (
                                            <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-300 animate-fade-in">
                                                <p className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-2 flex items-center">
                                                    <ChartPieIcon className="h-4 w-4 mr-1"/> ФИКСАЦИЯ ПОТЕРЬ: Объясните причину брака/перерасхода
                                                </p>
                                                <textarea 
                                                    value={anomalyJustification}
                                                    onChange={e => setAnomalyJustification(e.target.value)}
                                                    placeholder="Например: Неровный срез, замятие упаковки, ошибка засыпки..."
                                                    className="w-full p-2 text-xs bg-white border border-orange-300 rounded mb-2 text-orange-900"
                                                    rows={2}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="ghost" onClick={() => {setShowAnomalyForm(null); setPendingUpdate(null);}}>Отмена</Button>
                                                    <Button size="sm" className="bg-orange-600 hover:bg-orange-500 text-white" disabled={!anomalyJustification.trim()} onClick={() => handleStepUpdate(runStep.stepId, { ...pendingUpdate?.data, completed: true }, true)}>
                                                        Зафиксировать потери
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {showBreachForm === runStep.stepId && (
                                            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 animate-fade-in">
                                                <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-2 flex items-center">
                                                    <HandRaisedIcon className="h-4 w-4 mr-1"/> АВАРИЙНЫЙ ПРОРЫВ: Требуется объяснительная
                                                </p>
                                                <textarea 
                                                    value={breachJustification}
                                                    onChange={e => setBreachJustification(e.target.value)}
                                                    placeholder="Почему запускаем без подтвержденного остатка?"
                                                    className="w-full p-2 text-xs bg-white border border-red-300 rounded mb-2 text-red-900"
                                                    rows={2}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="ghost" onClick={() => setShowBreachForm(null)}>Отмена</Button>
                                                    <Button size="sm" variant="danger" disabled={!breachJustification.trim()} onClick={() => handleStepUpdate(runStep.stepId, { completed: true }, true)}>
                                                        Подтверждаю ответственность
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        <div className="pt-4 border-t border-brand-border flex justify-end">
            <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </Modal>
    
    {isScannerOpen && (
        <ScannerModal 
            isOpen={isScannerOpen} 
            onClose={() => {setIsScannerOpen(false); setActiveScanStepId(null);}} 
            onScan={handleScanResult} 
            title="Подтверждение использования материала"
        />
    )}
    </>
  );
};

export default ProductionRunModal;
