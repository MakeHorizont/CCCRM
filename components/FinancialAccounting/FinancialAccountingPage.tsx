
import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { apiService } from '../../services/apiService';
import { Transaction, TransactionCategory, MonthlyExpense, EquipmentItem, ProductionOrder, TechnologyCard, CompanyRequisites } from '../../types';
import { BanknotesIcon, CalculatorIcon, BoltIcon, CheckCircleIcon, ScaleIcon, ShieldCheckIcon, SaveIcon } from '../UI/Icons';
import { useAuth } from '../../hooks/useAuth';
import Input from '../UI/Input';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const expenseFields: { key: string; label: string }[] = [
    { key: 'rent', label: 'Аренда (+ отопление)' },
    { key: 'supplies', label: 'Общие хозтовары (не для BOM)' },
    { key: 'cleaning', label: 'Клининг' },
    { key: 'repairs', label: 'Ремонт' },
    { key: 'waterAndOtherUtilities', label: 'Вода и прочие комм. услуги' }
];


const StatCard: React.FC<{ title: string; value: string; colorClass?: string }> = ({ title, value, colorClass = 'text-brand-text-primary' }) => (
    <div className="p-4 bg-brand-surface rounded-lg border border-brand-border h-full flex flex-col justify-center">
        <p className="text-sm text-brand-text-secondary mb-1">{title}</p>
        <p className={`text-xl font-bold truncate ${colorClass}`}>{value}</p>
    </div>
);

const FinancialAccountingPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [expenses, setExpenses] = useState<Partial<MonthlyExpense>>({});
    const [companyReqs, setCompanyReqs] = useState<Partial<CompanyRequisites>>({});
    const [allActiveEquipment, setAllActiveEquipment] = useState<EquipmentItem[]>([]);
    const [allTechCards, setAllTechCards] = useState<TechnologyCard[]>([]);
    const [completedPOs, setCompletedPOs] = useState<ProductionOrder[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const fetchAllData = useCallback(async (year: number, month: number) => {
        setIsLoading(true);
        setError(null);
        setSaveSuccess(false);
        try {
            const [allTxns, expenseData, equipmentData, poData, techCardsData, reqs] = await Promise.all([
                apiService.getTransactions({ viewMode: 'active' }),
                apiService.getMonthlyExpense(year, month),
                apiService.getEquipmentItems({ viewMode: 'active' }),
                apiService.getProductionOrders({ viewMode: 'active' }),
                /**
                 * Fixed: Added {} argument to getTechnologyCards
                 */
                apiService.getTechnologyCards({}),
                apiService.getCompanyRequisites()
            ]);
            setAllTransactions(allTxns);
            setExpenses(expenseData || { year, month, rent: 0, supplies: 0, cleaning: 0, repairs: 0, electricityPricePerKwh: 5.5, waterAndOtherUtilities: 0 });
            setAllActiveEquipment(equipmentData);
            setAllTechCards(techCardsData);
            setCompanyReqs(reqs || { taxSystem: 'usn_6', annualInsuranceFixed: 49500 });

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
            setError('Не удалось загрузить финансовые данные.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth, fetchAllData]);

    const { periodTransactions, periodLabel } = useMemo(() => {
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
        const label = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
        const filtered = allTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= startDate && txDate <= endDate;
        });
        return { periodTransactions: filtered, periodLabel: label };
    }, [allTransactions, selectedYear, selectedMonth]);

    const { income, directExpenses } = useMemo(() => {
        const inc = periodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const exp = periodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income: inc, directExpenses: exp };
    }, [periodTransactions]);

    const { totalElectricityKwh } = useMemo(() => {
        let totalKwh = 0;
        const techCardMap = allTechCards.reduce((acc, card) => ({ ...acc, [card.warehouseItemId]: card }), {} as Record<string, TechnologyCard>);
        completedPOs.forEach(po => {
            po.orderItems.forEach(item => {
                const card = techCardMap[item.warehouseItemId];
                if (card && item.producedQuantity && item.producedQuantity > 0) {
                    card.steps.forEach(step => {
                        if ((step.type === 'action' || step.type === 'process') && step.requiredEquipmentId && step.durationMinutes && step.powerUsagePercentage) {
                            const equipment = allActiveEquipment.find(eq => eq.id === step.requiredEquipmentId);
                            if (equipment?.powerKw) {
                                const kwhPerRun = (equipment.powerKw * (step.powerUsagePercentage / 100)) * (step.durationMinutes / 60);
                                totalKwh += kwhPerRun * item.producedQuantity;
                            }
                        }
                    });
                }
            });
        });
        allActiveEquipment.forEach(eq => {
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            if (eq.usageType === 'continuous_24_7' && eq.powerKw) totalKwh += eq.powerKw * 24 * daysInMonth;
            if (eq.usageType === 'working_hours' && eq.powerKw) totalKwh += eq.powerKw * 8 * 22; 
        });
        return { totalElectricityKwh: totalKwh };
    }, [completedPOs, allTechCards, allActiveEquipment, selectedYear, selectedMonth]);

    const electricityCost = useMemo(() => totalElectricityKwh * (expenses.electricityPricePerKwh || 0), [totalElectricityKwh, expenses.electricityPricePerKwh]);
    const totalDepreciation = useMemo(() => {
        if (!income || !allActiveEquipment) return 0;
        return allActiveEquipment.reduce((total, eq) => {
            if (eq.amortization.method === 'percentage_of_income') {
                return total + ((income * (eq.amortization.amortizationPercentage || 0)) / 100);
            }
            return total;
        }, 0);
    }, [income, allActiveEquipment]);

    const indirectExpensesTotal = useMemo(() => {
        const manual = expenseFields.reduce((sum, field) => sum + (Number((expenses as any)[field.key]) || 0), 0);
        return manual + totalDepreciation + electricityCost;
    }, [expenses, totalDepreciation, electricityCost]);

    const insuranceMonthPart = useMemo(() => {
        const fixed = (companyReqs.annualInsuranceFixed || 49500) / 12;
        const variable = income > 25000 ? (income - 25000) * 0.01 : 0; // 1% over 300k year (25k month)
        return fixed + variable;
    }, [companyReqs.annualInsuranceFixed, income]);

    const taxesCalculated = useMemo(() => {
        if (companyReqs.taxSystem === 'usn_15') {
            const taxableBase = income - directExpenses - indirectExpensesTotal - insuranceMonthPart;
            return Math.max(income * 0.01, taxableBase * 0.15); // Minimum 1% of turnover
        }
        return Math.max(0, (income * 0.06) - insuranceMonthPart); // USN 6% with deduction
    }, [companyReqs.taxSystem, income, directExpenses, indirectExpensesTotal, insuranceMonthPart]);

    const netProfit = useMemo(() => {
        return income - directExpenses - indirectExpensesTotal - insuranceMonthPart - taxesCalculated;
    }, [income, directExpenses, indirectExpensesTotal, insuranceMonthPart, taxesCalculated]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setExpenses(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSaveSuccess(false);
        try {
            await apiService.updateMonthlyExpense({
                id: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`,
                year: selectedYear,
                month: selectedMonth,
                totalIncome: income,
                rent: expenses.rent || 0,
                supplies: expenses.supplies || 0,
                cleaning: expenses.cleaning || 0,
                repairs: expenses.repairs || 0,
                electricityPricePerKwh: expenses.electricityPricePerKwh || 0,
                waterAndOtherUtilities: expenses.waterAndOtherUtilities || 0,
                updatedAt: new Date().toISOString(),
                depreciation: totalDepreciation,
                electricityCost: electricityCost,
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError('Ошибка сохранения.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const toggleTaxSystem = async () => {
        const newSystem = companyReqs.taxSystem === 'usn_6' ? 'usn_15' : 'usn_6';
        try {
            const updated = await apiService.updateCompanyRequisites({ ...companyReqs, taxSystem: newSystem });
            setCompanyReqs(updated);
        } catch(e) { alert(e); }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                <BanknotesIcon className="h-8 w-8 mr-3 text-brand-primary" />
                Финансовый Центр
            </h1>

            <Card>
                <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                    <div className="flex items-center space-x-2">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-brand-card border border-brand-border rounded-lg p-2 text-sm">
                            {MONTH_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                        </select>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-brand-card border border-brand-border rounded-lg p-2 text-sm">
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                     <div className="flex items-center gap-4 bg-brand-surface p-2 rounded-lg border border-brand-border shadow-inner">
                        <span className="text-xs font-bold uppercase text-brand-text-muted">Налоги:</span>
                        <div className="flex bg-brand-card rounded-md p-1">
                            <button onClick={() => companyReqs.taxSystem !== 'usn_6' && toggleTaxSystem()} className={`px-2 py-1 text-[10px] font-black rounded ${companyReqs.taxSystem === 'usn_6' ? 'bg-sky-500 text-white' : 'text-brand-text-muted'}`}>УСН 6%</button>
                            <button onClick={() => companyReqs.taxSystem !== 'usn_15' && toggleTaxSystem()} className={`px-2 py-1 text-[10px] font-black rounded ${companyReqs.taxSystem === 'usn_15' ? 'bg-amber-600 text-white' : 'text-brand-text-muted'}`}>УСН 15%</button>
                        </div>
                    </div>
                </div>

                {isLoading ? <LoadingSpinner /> : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Валовый Доход" value={`${income.toLocaleString()} ₽`} colorClass="text-emerald-400" />
                            <StatCard title="Прямые Расходы" value={`${directExpenses.toLocaleString()} ₽`} colorClass="text-red-400" />
                            <StatCard title="Налоги и Взносы" value={`${(taxesCalculated + insuranceMonthPart).toLocaleString('ru-RU', {maximumFractionDigits: 0})} ₽`} colorClass="text-orange-400" />
                            <StatCard title="Чистая Прибыль" value={`${netProfit.toLocaleString('ru-RU', {maximumFractionDigits: 0})} ₽`} colorClass={netProfit >= 0 ? 'text-brand-primary' : 'text-red-500'}/>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="!p-4">
                                <h3 className="font-bold text-sm mb-4 border-b border-brand-border pb-1 uppercase tracking-tight">Косвенные расходы за период</h3>
                                <div className="space-y-3">
                                    {expenseFields.map(field => (
                                        <Input key={field.key} id={field.key} name={field.key} label={field.label} type="number" value={String((expenses as any)[field.key] || '')} onChange={handleInputChange} disabled={expenses.isClosed} className="!py-1.5 text-xs" smallLabel/>
                                    ))}
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input id="electricityPricePerKwh" name="electricityPricePerKwh" label="Тариф электро (₽)" type="number" step="0.01" value={String(expenses.electricityPricePerKwh || '')} onChange={handleInputChange} disabled={expenses.isClosed} className="!py-1.5 text-xs" smallLabel/>
                                        <div className="p-1.5 bg-brand-surface rounded border border-brand-border flex flex-col justify-center">
                                            <p className="text-[10px] text-brand-text-muted uppercase">Электроэнергия</p>
                                            <p className="text-xs font-bold">{electricityCost.toLocaleString()} ₽</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-brand-surface rounded-lg border-2 border-dashed border-brand-border">
                                        <p className="text-[10px] text-brand-text-muted uppercase font-bold">Итого косвенных:</p>
                                        <p className="text-xl font-black text-brand-text-primary">{indirectExpensesTotal.toLocaleString()} ₽</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="!p-4 border-sky-600/30">
                                <h3 className="font-bold text-sm mb-4 border-b border-brand-border pb-1 uppercase tracking-tight">Налоговый расчет и взносы</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between items-center p-2 bg-brand-surface rounded">
                                        <span className="text-brand-text-secondary">Страховые взносы (месяц):</span>
                                        <span className="font-mono font-bold">{insuranceMonthPart.toLocaleString()} ₽</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-brand-surface rounded">
                                        <span className="text-brand-text-secondary">База для налогообложения:</span>
                                        <span className="font-mono font-bold">{(income - directExpenses - indirectExpensesTotal).toLocaleString()} ₽</span>
                                    </div>
                                    <div className="p-4 bg-sky-900/10 border border-sky-500/30 rounded-xl">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center">
                                                <CalculatorIcon className="h-5 w-5 mr-2 text-sky-400"/>
                                                <span className="font-bold text-sky-400">Налог к начислению:</span>
                                            </div>
                                            <span className="text-2xl font-black text-brand-text-primary">{taxesCalculated.toLocaleString()} ₽</span>
                                        </div>
                                        <p className="text-[10px] text-brand-text-muted mt-2">
                                            {companyReqs.taxSystem === 'usn_15' ? '* Расчет: (Доходы - Расходы) * 15% (но не менее 1% от оборота)' : '* Расчет: Доходы * 6% (за вычетом взносов)'}
                                        </p>
                                    </div>
                                    
                                    <div className="pt-4 flex justify-end gap-3">
                                         {saveSuccess && <span className="text-emerald-500 flex items-center text-sm"><CheckCircleIcon className="h-4 w-4 mr-1"/> Сохранено</span>}
                                         <Button onClick={handleSave} isLoading={isSaving} size="sm" leftIcon={<SaveIcon className="h-4 w-4"/>}>Сохранить данные месяца</Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                        
                        <div className="flex justify-between items-center p-4 bg-brand-surface rounded-xl border-l-4 border-brand-primary">
                             <div>
                                 <h3 className="font-bold text-brand-text-primary">Распределение Чистой Прибыли</h3>
                                 <p className="text-xs text-brand-text-muted">Доступно для отчислений в фонды и выплаты дивидендов.</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-3xl font-black text-emerald-500">{netProfit.toLocaleString()} ₽</p>
                             </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default FinancialAccountingPage;
