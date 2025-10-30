import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { apiService } from '../../services/apiService';
import { Transaction, TransactionCategory, MonthlyExpense, EquipmentItem, ProductionOrder, TechnologyCard } from '../../types';
import { BanknotesIcon, CalculatorIcon, BoltIcon, CheckCircleIcon } from '../UI/Icons';
import { useAuth } from '../../hooks/useAuth';
import Input from '../UI/Input';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

type PeriodType = 'month' | 'quarter' | 'year';

const expenseFields: { key: keyof Omit<MonthlyExpense, 'id' | 'year' | 'month' | 'updatedAt' | 'totalIncome' | 'depreciation' | 'electricityCost' | 'isClosed'>; label: string }[] = [
    { key: 'rent', label: 'Аренда (+ отопление)' },
    { key: 'supplies', label: 'Общие хозтовары (не для BOM)' },
    { key: 'cleaning', label: 'Клининг' },
    { key: 'repairs', label: 'Ремонт' },
    { key: 'waterAndOtherUtilities', label: 'Вода и прочие комм. услуги' }
];


const StatCard: React.FC<{ title: string; value: string; colorClass?: string }> = ({ title, value, colorClass = 'text-brand-text-primary' }) => (
    <div className="p-4 bg-brand-surface rounded-lg border border-brand-border">
        <p className="text-sm text-brand-text-secondary">{title}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const BarChart: React.FC<{ data: { label: string; income: number; expense: number }[] }> = ({ data }) => {
    const maxVal = useMemo(() => Math.max(...data.flatMap(d => [d.income, d.expense]), 1), [data]);
    
    return (
        <div className="h-64 flex items-end space-x-2 p-2 border border-brand-border rounded-lg bg-brand-surface">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                     <div className="flex items-end w-full h-full space-x-1 justify-center">
                        <div className="w-1/2 bg-emerald-800/50 rounded-t-sm" style={{ height: `${(d.income / maxVal) * 100}%` }}></div>
                        <div className="w-1/2 bg-red-800/50 rounded-t-sm" style={{ height: `${(d.expense / maxVal) * 100}%` }}></div>
                    </div>
                    <span className="text-xs text-brand-text-muted mt-1">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

const ExpenseBreakdown: React.FC<{ expenses: Transaction[], totalExpenses: number }> = ({ expenses, totalExpenses }) => {
    const byCategory = useMemo(() => {
        const map: Record<TransactionCategory, number> = {} as any;
        expenses.forEach(tx => {
            map[tx.category] = (map[tx.category] || 0) + tx.amount;
        });
        return Object.entries(map).sort(([, a], [, b]) => b - a);
    }, [expenses]);

    if (totalExpenses === 0) return <p className="text-sm text-brand-text-muted">Нет данных о расходах по транзакциям.</p>;

    return (
        <div className="space-y-2">
            {byCategory.map(([category, amount]) => {
                const percentage = (amount / totalExpenses) * 100;
                return (
                    <div key={category}>
                        <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-brand-text-secondary">{category}</span>
                            <span className="font-medium text-brand-text-primary">{amount.toLocaleString('ru-RU')} ₽ ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-zinc-700/50 rounded-full h-1.5">
                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const FinancialAccountingPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [periodType, setPeriodType] = useState<PeriodType>('month');
    
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [expenses, setExpenses] = useState<Partial<MonthlyExpense>>({});
    const [allActiveEquipment, setAllActiveEquipment] = useState<EquipmentItem[]>([]);
    const [allTechCards, setAllTechCards] = useState<TechnologyCard[]>([]);
    const [completedPOs, setCompletedPOs] = useState<ProductionOrder[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [closeMonthStatus, setCloseMonthStatus] = useState<{loading: boolean, message: string, error: boolean}>({loading: false, message: '', error: false});

    const fetchAllData = useCallback(async (year: number, month: number) => {
        setIsLoading(true);
        setError(null);
        setSaveSuccess(false);
        setCloseMonthStatus({loading: false, message: '', error: false});
        try {
            const [allTxns, expenseData, equipmentData, poData, techCardsData] = await Promise.all([
                apiService.getTransactions({ viewMode: 'active' }),
                apiService.getMonthlyExpense(year, month),
                apiService.getEquipmentItems({ viewMode: 'active' }),
                apiService.getProductionOrders({ viewMode: 'active' }),
                apiService.getTechnologyCards()
            ]);
            setAllTransactions(allTxns);
            setExpenses(expenseData || { year, month, rent: 0, supplies: 0, cleaning: 0, repairs: 0, electricityPricePerKwh: 5.5, waterAndOtherUtilities: 0 });
            setAllActiveEquipment(equipmentData);
            setAllTechCards(techCardsData);

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
        let startDate: Date, endDate: Date, label = '';
        switch (periodType) {
            case 'month':
                startDate = new Date(selectedYear, selectedMonth, 1);
                endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
                label = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
                break;
            case 'quarter':
                const quarter = Math.floor(selectedMonth / 3);
                startDate = new Date(selectedYear, quarter * 3, 1);
                endDate = new Date(selectedYear, quarter * 3 + 3, 0, 23, 59, 59);
                label = `${quarter + 1}-й квартал ${selectedYear}`;
                break;
            case 'year':
                startDate = new Date(selectedYear, 0, 1);
                endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
                label = `${selectedYear} год`;
                break;
        }
        const filtered = allTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= startDate && txDate <= endDate;
        });
        return { periodTransactions: filtered, periodLabel: label };
    }, [allTransactions, periodType, selectedYear, selectedMonth]);

    const { summaryStats, monthlyChartData, expenseBreakdownData } = useMemo(() => {
        const income = periodTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = periodTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        const chartData = MONTH_NAMES.map((monthName, index) => {
            const monthTxns = allTransactions.filter(tx => new Date(tx.date).getFullYear() === selectedYear && new Date(tx.date).getMonth() === index);
            return {
                label: monthName.slice(0,3),
                income: monthTxns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0),
                expense: monthTxns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0),
            };
        });

        return {
            summaryStats: { income, expenses },
            monthlyChartData: chartData,
            expenseBreakdownData: periodTransactions.filter(t => t.type === 'expense'),
        };
    }, [periodTransactions, allTransactions, selectedYear]);

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
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        let workdaysInMonth = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, selectedMonth, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) workdaysInMonth++;
        }
        allActiveEquipment.forEach(eq => {
            if (eq.usageType === 'continuous_24_7' && eq.powerKw) totalKwh += eq.powerKw * 24 * daysInMonth;
            if (eq.usageType === 'working_hours' && eq.powerKw) totalKwh += eq.powerKw * 8 * workdaysInMonth;
        });
        return { totalElectricityKwh: totalKwh };
    }, [completedPOs, allTechCards, allActiveEquipment, selectedYear, selectedMonth]);

    const electricityCost = useMemo(() => totalElectricityKwh * (expenses.electricityPricePerKwh || 0), [totalElectricityKwh, expenses.electricityPricePerKwh]);
    const totalDepreciation = useMemo(() => {
        if (!expenses.totalIncome || !allActiveEquipment) return 0;
        return allActiveEquipment.reduce((total, eq) => {
            if (eq.amortization.method === 'percentage_of_income') {
                return total + ((expenses.totalIncome! * (eq.amortization.amortizationPercentage || 0)) / 100);
            }
            return total;
        }, 0);
    }, [expenses.totalIncome, allActiveEquipment]);
    const totalIndirectExpenses = useMemo(() => {
        const manual = expenseFields.reduce((sum, field) => sum + (Number(expenses[field.key as keyof typeof expenses]) || 0), 0);
        return manual + totalDepreciation + electricityCost;
    }, [expenses, totalDepreciation, electricityCost]);
    
    const { netProfit, netProfitability } = useMemo(() => {
        const totalIncome = summaryStats.income;
        const totalDirectExpenses = summaryStats.expenses;
        const netProfitCalc = totalIncome - totalDirectExpenses - totalIndirectExpenses;
        const netProfitabilityCalc = totalIncome > 0 ? (netProfitCalc / totalIncome) * 100 : 0;
        return { netProfit: netProfitCalc, netProfitability: netProfitabilityCalc };
    }, [summaryStats, totalIndirectExpenses]);

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
                rent: expenses.rent || 0,
                supplies: expenses.supplies || 0,
                cleaning: expenses.cleaning || 0,
                repairs: expenses.repairs || 0,
                electricityPricePerKwh: expenses.electricityPricePerKwh || 0,
                waterAndOtherUtilities: expenses.waterAndOtherUtilities || 0,
                updatedAt: new Date().toISOString(),
                depreciation: totalDepreciation,
                electricityCost: electricityCost,
            };
            await apiService.updateMonthlyExpense(payload);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError('Ошибка сохранения данных.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCloseMonth = async () => {
        setCloseMonthStatus({ loading: true, message: '', error: false });
        try {
            await handleSave();
            const result = await apiService.closeMonthAndContributeToFund(selectedYear, selectedMonth);
            setCloseMonthStatus({ loading: false, message: result.message, error: false });
            await fetchAllData(selectedYear, selectedMonth);
        } catch (err) {
            setCloseMonthStatus({ loading: false, message: (err as Error).message, error: true });
        }
    };

    const isMonthClosable = !expenses?.isClosed && new Date(selectedYear, selectedMonth) < new Date(new Date().getFullYear(), new Date().getMonth());

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                <BanknotesIcon className="h-8 w-8 mr-3 text-brand-primary" />
                Финансовая Сводка
            </h1>

            <Card>
                <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
                    <div className="flex space-x-1 p-1 bg-brand-surface rounded-lg">
                        <Button size="sm" variant={periodType === 'month' ? 'secondary' : 'ghost'} onClick={() => setPeriodType('month')}>Месяц</Button>
                        <Button size="sm" variant={periodType === 'quarter' ? 'secondary' : 'ghost'} onClick={() => setPeriodType('quarter')}>Квартал</Button>
                        <Button size="sm" variant={periodType === 'year' ? 'secondary' : 'ghost'} onClick={() => setPeriodType('year')}>Год</Button>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Link to={ROUTE_PATHS.TRANSACTIONS}><Button variant="secondary">Все транзакции</Button></Link>
                        {periodType === 'month' && (
                             <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-brand-card border border-brand-border rounded-lg p-2 text-sm text-brand-text-primary focus:ring-sky-500">
                                {MONTH_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
                            </select>
                        )}
                        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-brand-card border border-brand-border rounded-lg p-2 text-sm text-brand-text-primary focus:ring-sky-500">
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {isLoading ? <LoadingSpinner /> : error ? <p className="text-red-500">{error}</p> : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title={`Общий Доход - ${periodLabel}`} value={`${summaryStats.income.toLocaleString('ru-RU')} ₽`} colorClass="text-emerald-400" />
                            <StatCard title={`Общий Расход - ${periodLabel}`} value={`${(summaryStats.expenses + totalIndirectExpenses).toLocaleString('ru-RU')} ₽`} colorClass="text-red-400" />
                            <StatCard title={`Чистая Прибыль - ${periodLabel}`} value={`${netProfit.toLocaleString('ru-RU')} ₽`} colorClass={netProfit >= 0 ? 'text-brand-text-primary' : 'text-red-400'}/>
                            <StatCard title="Чистая Рентабельность" value={`${netProfitability.toFixed(1)}%`} colorClass={netProfitability >= 0 ? 'text-brand-text-primary' : 'text-red-400'}/>
                        </div>

                        {periodType === 'month' && (
                            <Card>
                                <h2 className="text-xl font-semibold text-brand-text-primary mb-4">Общие Расходы за {MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                        <Input id="electricityPricePerKwh" name="electricityPricePerKwh" label="Цена за кВт/ч (₽)" type="number" step="0.01" value={String(expenses.electricityPricePerKwh || '')} onChange={handleInputChange} disabled={expenses.isClosed}/>
                                        <Input key="electricityCost" id="electricityCost" name="electricityCost" label="Электроэнергия (расчет)" type="number" value={electricityCost.toFixed(2)} disabled icon={<BoltIcon className="h-5 w-5 text-yellow-400"/>}/>
                                        <Input key="depreciation" id="depreciation" name="depreciation" label="Амортизация (расчет)" type="number" value={totalDepreciation.toFixed(2)} disabled/>
                                        {expenseFields.map(field => (
                                            <Input key={field.key} id={field.key} name={field.key} label={field.label} type="number" value={String(expenses[field.key as keyof typeof expenses] || '')} onChange={handleInputChange} placeholder="0.00" disabled={expenses.isClosed}/>
                                        ))}
                                    </div>
                                    <div className="pt-4 border-t border-brand-border flex justify-between items-center">
                                        <div className="text-lg font-semibold text-brand-text-primary">Итого косвенных расходов: <span className="text-orange-400">{totalIndirectExpenses.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</span></div>
                                        <div className="flex items-center space-x-4">
                                            {saveSuccess && <span className="text-emerald-500 flex items-center text-sm"><CheckCircleIcon className="h-5 w-5 mr-1"/>Сохранено</span>}
                                            <Button onClick={handleSave} isLoading={isSaving} disabled={isLoading || expenses.isClosed}>Сохранить расходы</Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2">
                                <h3 className="font-semibold mb-2">Доходы и Расходы по транзакциям за {selectedYear} г.</h3>
                                <BarChart data={monthlyChartData} />
                            </Card>
                            <Card>
                                <h3 className="font-semibold mb-2">Структура расходов по транзакциям ({periodLabel})</h3>
                                <ExpenseBreakdown expenses={expenseBreakdownData} totalExpenses={summaryStats.expenses} />
                            </Card>
                        </div>
                        
                        {currentUser?.role === 'ceo' && periodType === 'month' && (
                            <Card>
                                <div className="flex flex-col sm:flex-row items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-brand-text-primary">Закрытие Финансового Месяца</h2>
                                        <p className="text-xs text-brand-text-muted">Эта операция рассчитает прибыль (доход по транзакциям минус все расходы) и произведет отчисления в Коллективный Фонд.</p>
                                    </div>
                                    <div className="mt-3 sm:mt-0 text-right">
                                        <Button onClick={handleCloseMonth} isLoading={closeMonthStatus.loading} disabled={!isMonthClosable} variant={isMonthClosable ? 'primary' : 'secondary'}>
                                            {expenses?.isClosed ? 'Месяц закрыт' : 'Закрыть месяц и отчислить в фонды'}
                                        </Button>
                                    </div>
                                </div>
                                {closeMonthStatus.message && (
                                    <p className={`text-xs mt-2 text-right ${closeMonthStatus.error ? 'text-red-400' : 'text-emerald-400'}`}>{closeMonthStatus.message}</p>
                                )}
                            </Card>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default FinancialAccountingPage;
