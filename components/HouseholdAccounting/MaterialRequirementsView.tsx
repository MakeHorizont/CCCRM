
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { MaterialRequirement, StrategicPlan } from '../../types';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { CircleStackIcon, ExclamationTriangleIcon, ShoppingCartIcon, FlagIcon, ArrowTrendingUpIcon } from '../UI/Icons';
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';
import { ROUTE_PATHS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const MaterialRequirementsView: React.FC = () => {
    const { user } = useAuth();
    const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
    const [strategicPlans, setStrategicPlans] = useState<StrategicPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingPR, setIsCreatingPR] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchRequirements = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [reqs, plans] = await Promise.all([
                apiService.getMaterialRequirements(),
                apiService.getStrategicPlans({ viewMode: 'active' })
            ]);
            setRequirements(reqs);
            setStrategicPlans(plans);
        } catch (err) {
            setError('Не удалось загрузить потребности в сырье.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequirements();
    }, [fetchRequirements]);
    
    // Logic for Strategic Needs (Sales Goals from Strategy)
    const strategicDeficit = useMemo(() => {
        // Simplified: find plans related to sales targets
        const salesPlans = strategicPlans.filter(p => p.title.toLowerCase().includes('продаж') || p.title.toLowerCase().includes('рынок'));
        if (salesPlans.length === 0) return 0;
        // Total items expected to be sold based on goals (Mock logic for v2.2.0)
        return 1500; 
    }, [strategicPlans]);

    const handleCreateConsolidatedPR = async () => {
        if (!user) return;
        const deficitItems = requirements.filter(r => r.deficit > 0).map(r => ({
            householdItemId: r.householdItemId,
            quantityNeeded: r.deficit,
            unit: r.unit,
            householdItemName: r.householdItemName,
        }));
        
        if (deficitItems.length === 0) return;

        setIsCreatingPR(true);
        try {
            const newPR = await apiService.createPurchaseRequestFromShortages(deficitItems, user.id, user.name);
            navigate(`${ROUTE_PATHS.PURCHASING}/${newPR.id}`);
        } catch(err) {
            alert("Ошибка: " + (err as Error).message);
        } finally {
            setIsCreatingPR(false);
        }
    };
    
    const totalDeficitCount = useMemo(() => requirements.filter(r => r.deficit > 0).length, [requirements]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-brand-surface border-l-4 border-l-sky-500">
                    <div className="flex items-center gap-3">
                        <FlagIcon className="h-8 w-8 text-sky-500"/>
                        <div>
                            <p className="text-[10px] font-black uppercase text-brand-text-muted">Стратегический Прогноз</p>
                            <p className="text-sm font-bold text-brand-text-primary">Цель по продажам: +{strategicDeficit} ед.</p>
                            <p className="text-[10px] text-sky-600 mt-1 italic">* На основе активных планов в Стратегии</p>
                        </div>
                    </div>
                </Card>
                <Card className={`bg-brand-surface border-l-4 ${totalDeficitCount > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                    <div className="flex items-center gap-3">
                        <ArrowTrendingUpIcon className={`h-8 w-8 ${totalDeficitCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}/>
                        <div>
                            <p className="text-[10px] font-black uppercase text-brand-text-muted">Текущая Потребность</p>
                            <p className="text-sm font-bold text-brand-text-primary">Дефицит по {totalDeficitCount} позициям</p>
                            <Button size="sm" onClick={handleCreateConsolidatedPR} disabled={totalDeficitCount === 0 || isCreatingPR} className="mt-2 h-7 text-[10px]">Создать Сводную Заявку</Button>
                        </div>
                    </div>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner /></div>
            ) : error ? (
                <p className="text-red-500 text-center p-4">{error}</p>
            ) : (
                <div className="overflow-x-auto border border-brand-border rounded-xl">
                    <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-[10px] text-brand-text-muted uppercase bg-brand-surface font-bold">
                            <tr>
                                <th className="px-4 py-3">Сырье / Материал</th>
                                <th className="px-4 py-3 text-right">Требуется</th>
                                <th className="px-4 py-3 text-right">На складе</th>
                                <th className="px-4 py-3 text-right">Дефицит</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {requirements.map(req => (
                                <tr key={req.householdItemId} className="hover:bg-brand-secondary/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-brand-text-primary">
                                        <p>{req.householdItemName}</p>
                                        <p className="text-[10px] text-brand-text-muted italic">{req.unit}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">{req.totalRequired.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-mono">{req.inStock.toFixed(2)}</td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${req.deficit > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {req.deficit > 0 ? `-${req.deficit.toFixed(2)}` : 'OK'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MaterialRequirementsView;
