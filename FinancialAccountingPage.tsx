import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import { apiService } from '../../services/apiService';
import { MonthlyExpense, EquipmentItem, ProductionOrder, TechnologyCard, Transaction } from '../../types';
import { BanknotesIcon, CheckCircleIcon, BoltIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

const expenseFields: { key: keyof Omit<MonthlyExpense, 'id' | 'year' | 'month' | 'updatedAt' | 'totalIncome' | 'depreciation' | 'electricityCost' | 'waterAndOtherUtilities' | 'electricityPricePerKwh'>; label: string }[] = [
    { key: 'rent', label: 'Аренда (+ отопление)' },
    { key: 'supplies', label: 'Общие хозтовары (не для BOM)' },
    { key: 'cleaning', label: 'Клининг' },
    { key: 'repairs', label: 'Ремонт' }
];

const FinancialAccountingPage: React.FC = () => {
    const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [expenses, setExpenses] = useState<Partial<MonthlyExpense>>({});
    const [allActiveEquipment, setAllActiveEquipment] = useState<EquipmentItem[]>([]);
    const [allTechCards, setAllTechCards] = useState<TechnologyCard[]>([]);
    const [completedPOs, setCompletedPOs] = useState<ProductionOrder[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const fetchAllData = useCallback(async (year: number, month: number) => {
        setIsLoading(true);
        setError(null);
        setSaveSuccess(false);
        try {
            const [expenseData, equipmentData, poData, techCardsData] = await Promise.all([
                apiService.getMonthlyExpense(year, month),
                apiService.getEquipmentItems({ viewMode: 'active' }),
                apiService.getProductionOrders({ viewMode: 'active' }), // Fetch all active to filter by date
                apiService.getTechnologyCards()
            ]);
            // The expenseData from API now includes calculated totalIncome
            setExpenses(expenseData || { year, month, totalIncome: 0, rent: 0, depreciation: 0, supplies: 0, cleaning: 0, repairs: 0, electricityPricePerKwh: 5.5, waterAndOtherUtilities: 0, electricityCost: 0 });
            setAllActiveEquipment(equipmentData);
            setAllTechCards(techCardsData);

            // Filter completed POs for the selected month/year
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);
            const completedInMonth = poData.filter(po => 
                po.status === 'Завершено' && 
                po.actualEndDate && 
                new Date(po.actualEndDate) >= startDate && 
                new Date(po.actualEndDate) <= endDate
            );
            setCompletedPOs(completedInMonth);

        } catch (err) {
            setError('Не удалось загрузить данные.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth, fetchAllData]);
    
    const { totalElectricityKwh } = useMemo(() => {
        let totalKwh = 0;
        
        // 1. On-demand equipment from completed POs
        const techCardMap = allTechCards.reduce((acc, card) => {
            acc[card.warehouseItemId] = card;
            return acc;
        }, {} as Record<string, TechnologyCard>);

        completedPOs.forEach(po => {
            po.orderItems.forEach(item => {
                const card = techCardMap[item.warehouseItemId];
                if (card && item.producedQuantity && item.producedQuantity > 0) {
                    card.steps.forEach(step => {
                        if ((step.type === 'action' || step.type === 'process') && step.requiredEquipmentId && step.durationMinutes && step.powerUsagePercentage) {
                            const equipment = allActiveEquipment.find(eq => eq.id === step.requiredEquipmentId);
                            if (equipment?.powerKw) {
                                const kwhPerRun = (equipment.powerKw * (step.powerUsagePercentage! / 100)) * (step.durationMinutes! / 60);
                                totalKwh += kwhPerRun * item.producedQuantity!;
                            }
                        }
                    });
                }
            });
        });

        // 2. Continuous 24/7 equipment
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        allActiveEquipment.forEach(eq => {
            if (eq.usageType === 'continuous_24_7' && eq.powerKw) {
                totalKwh += eq.powerKw * 24 * daysInMonth;
            }
        });

        // 3. Working hours equipment
        let workdaysInMonth = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, selectedMonth, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Sunday=0, Saturday=6
                workdaysInMonth++;
            }
        }
        allActiveEquipment.forEach(eq => {
            if (eq.usageType === 'working_hours' && eq.powerKw) {
                totalKwh += eq.powerKw * 8 * workdaysInMonth; // Assuming 8-hour workday
            }
        });
        
        return { totalElectricityKwh: totalKwh };

    }, [completedPOs, allTechCards, allActiveEquipment, selectedYear, selectedMonth]);
    
    const electricityCost = useMemo(() => {
        return totalElectricityKwh * (expenses.electricityPricePerKwh || 0);
    }, [totalElectricityKwh, expenses.electricityPricePerKwh]);

    const totalDepreciation = useMemo(() => {
        if (!expenses.totalIncome || !allActiveEquipment) return 0;
        return allActiveEquipment.reduce((total, eq) => {
            if (eq.amortization.method === 'percentage_of_income') {
                const percentage = eq.amortization.amortizationPercentage || 0;
                const equipmentDepreciation = (expenses.totalIncome! * percentage) / 100;
                return total + equipmentDepreciation;
            }
            return total;
        }, 0);
    }, [expenses.totalIncome, allActiveEquipment]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setExpenses(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSaveSuccess(false);
        try {
            const payload: MonthlyExpense = {
                id: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`,
                year: selectedYear,
                month: selectedMonth,
                totalIncome: expenses.totalIncome || 0,
                rent: expenses.rent || 0,
                depreciation: totalDepreciation,
                supplies: expenses.supplies || 0,
                cleaning: expenses.cleaning || 0,
                repairs: expenses.repairs || 0,
                electricityPricePerKwh: expenses.electricityPricePerKwh || 0,
                waterAndOtherUtilities: expenses.waterAndOtherUtilities || 0,
                electricityCost: electricityCost,
                updatedAt: new Date().toISOString(),
            };
            await apiService.updateMonthlyExpense(payload);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError('Ошибка сохранения данных.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };
    
    const totalExpenses = useMemo(() => {
        const manualExpenses = expenseFields.reduce((sum, field) => sum + (Number(expenses[field.key as keyof typeof expenses]) || 0), 0);
        return manualExpenses + totalDepreciation + electricityCost + (expenses.waterAndOtherUtilities || 0);
    }, [expenses, totalDepreciation, electricityCost]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                <BanknotesIcon className="h-8 w-8 mr-3 text-brand-primary" />
                Финансовый Учет: Общие Расходы
            </h1>

            <Card>
                <div className="md:flex justify-between items-center mb-6">
                    <p className="text-brand-text-secondary mb-4 md:mb-0">
                        Внесите ежемесячные косвенные расходы, которые будут распределяться на себестоимость продукции.
                    </p>
                    <div className="flex space-x-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"
                        >
                            {MONTH_NAMES.map((name, index) => (
                                <option key={name} value={index}>{name}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-text-primary focus:ring-sky-500 focus:border-sky-500"
                        >
                            {YEARS.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8"><LoadingSpinner /></div>
                ) : error ? (
                    <p className="text-red-500 text-center">{error}</p>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-brand-surface rounded-lg border border-brand-border">
                             <Input
                                id="totalIncome"
                                name="totalIncome"
                                label="Общий доход за месяц (₽, из транзакций)"
                                type="number"
                                value={String(expenses.totalIncome || '0.00')}
                                disabled
                            />
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                           <Input
                                id="electricityPricePerKwh"
                                name="electricityPricePerKwh"
                                label="Цена за кВт/ч (₽)"
                                type="number"
                                step="0.01"
                                value={String(expenses.electricityPricePerKwh || '')}
                                onChange={handleInputChange}
                            />
                            <div className="p-3 bg-brand-surface rounded-md flex items-center justify-between">
                                <span className="text-sm font-medium text-brand-text-secondary">Расчетное потребление:</span>
                                <span className="text-sm font-semibold text-brand-text-primary">{totalElectricityKwh.toFixed(2)} кВт/ч</span>
                            </div>
                             <Input
                                key="electricityCost"
                                id="electricityCost"
                                name="electricityCost"
                                label="Стоимость электроэнергии (расчетная)"
                                type="number"
                                value={electricityCost.toFixed(2)}
                                disabled
                                icon={<BoltIcon className="h-5 w-5 text-yellow-400"/>}
                            />
                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                            {expenseFields.map(field => (
                                <Input
                                    key={field.key}
                                    id={field.key}
                                    name={field.key}
                                    label={field.label}
                                    type="number"
                                    value={String(expenses[field.key as keyof typeof expenses] || '')}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                />
                            ))}
                             <Input
                                id="waterAndOtherUtilities"
                                name="waterAndOtherUtilities"
                                label="Вода и прочие комм. услуги (₽)"
                                type="number"
                                value={String(expenses.waterAndOtherUtilities || '')}
                                onChange={handleInputChange}
                                placeholder="0.00"
                            />
                             <Input
                                key="depreciation"
                                id="depreciation"
                                name="depreciation"
                                label="Амортизация оборудования (расчетная)"
                                type="number"
                                value={totalDepreciation.toFixed(2)}
                                disabled
                            />
                        </div>
                        <div className="pt-4 border-t border-brand-border flex justify-between items-center">
                             <div className="text-lg font-semibold text-brand-text-primary">
                                Итого за месяц: 
                                <span className="text-emerald-400 ml-2">
                                    {totalExpenses.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}
                                </span>
                            </div>
                            <div className="flex items-center space-x-4">
                               {saveSuccess && <span className="text-emerald-500 flex items-center text-sm"><CheckCircleIcon className="h-5 w-5 mr-1"/>Сохранено</span>}
                                <Button onClick={handleSave} isLoading={isSaving} disabled={isLoading}>
                                    Сохранить расходы за {MONTH_NAMES[selectedMonth]}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default FinancialAccountingPage;