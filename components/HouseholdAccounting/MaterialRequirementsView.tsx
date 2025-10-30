import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { MaterialRequirement } from '../../types';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { CircleStackIcon, ExclamationTriangleIcon, ShoppingCartIcon } from '../UI/Icons';
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';
import { ROUTE_PATHS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const MaterialRequirementsView: React.FC = () => {
    const { user } = useAuth();
    const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingPR, setIsCreatingPR] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchRequirements = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiService.getMaterialRequirements();
            setRequirements(data);
        } catch (err) {
            setError('Не удалось загрузить потребности в сырье.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequirements();
    }, [fetchRequirements]);
    
    const handleCreateConsolidatedPurchaseRequest = async () => {
        if (!user) {
            setError("Пользователь не аутентифицирован.");
            return;
        }
        
        const deficitItems = requirements.filter(r => r.deficit > 0).map(r => ({
            householdItemId: r.householdItemId,
            quantityNeeded: r.deficit,
            unit: r.unit,
            householdItemName: r.householdItemName,
        }));
        
        if (deficitItems.length === 0) {
            alert("Нет дефицитных позиций для создания заявки.");
            return;
        }

        setIsCreatingPR(true);
        setError(null);
        try {
            const newPR = await apiService.createPurchaseRequestFromShortages(deficitItems, user.id, user.name);
            alert(`Создана сводная заявка на закупку #${newPR.id}.`);
            navigate(`${ROUTE_PATHS.PURCHASING}?requestId=${newPR.id}`);
        } catch(err) {
            setError((err as Error).message || "Ошибка при создании сводной заявки.");
        } finally {
            setIsCreatingPR(false);
        }
    };
    
    const totalDeficitItemsCount = useMemo(() => {
        return requirements.filter(r => r.deficit > 0).length;
    }, [requirements]);

    return (
        <div className="space-y-4">
            <p className="text-sm text-brand-text-secondary">
                Здесь показана агрегированная потребность в сырье для всех активных производственных заданий,
                сравненная с текущими остатками на складе.
            </p>
            
            {totalDeficitItemsCount > 0 && (
                 <div className="mb-4 p-3 bg-amber-800/20 border border-amber-600/30 rounded-lg text-sm text-amber-300 flex items-center justify-between">
                    <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2"/>
                        Обнаружен дефицит по <strong className="mx-1">{totalDeficitItemsCount}</strong> позициям.
                    </div>
                     <Button 
                        onClick={handleCreateConsolidatedPurchaseRequest}
                        isLoading={isCreatingPR}
                        leftIcon={<ShoppingCartIcon className="h-5 w-5"/>}
                        size="sm"
                    >
                        Создать сводную заявку
                    </Button>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center p-8"><LoadingSpinner /></div>
            ) : error ? (
                <p className="text-red-500 text-center p-4">{error}</p>
            ) : requirements.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-brand-text-secondary">
                        <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                            <tr>
                                <th className="px-4 py-3">Сырье / Материал</th>
                                <th className="px-4 py-3 text-right">Требуется всего</th>
                                <th className="px-4 py-3 text-right">На складе</th>
                                <th className="px-4 py-3 text-right">Дефицит / Излишек</th>
                                <th className="px-4 py-3 text-left">Потребность от ПЗ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {requirements.map(req => (
                                <tr key={req.householdItemId} className="hover:bg-brand-secondary">
                                    <td className="px-4 py-3 font-medium text-brand-text-primary">
                                        <p>{req.householdItemName}</p>
                                        <p className="text-xs text-brand-text-muted">Ед. изм: {req.unit}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right">{req.totalRequired.toFixed(3)}</td>
                                    <td className="px-4 py-3 text-right">{req.inStock.toFixed(3)}</td>
                                    <td className={`px-4 py-3 text-right font-semibold ${req.deficit > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                        {req.deficit > 0 ? `-${req.deficit.toFixed(3)}` : `+${(req.inStock - req.totalRequired).toFixed(3)}`}
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <Tooltip text={
                                            <ul className="text-left">{req.relatedPOs.map(po => <li key={po.id}>{po.name}: {po.qty.toFixed(2)} {req.unit}</li>)}</ul>
                                        }>
                                            <span>{req.relatedPOs.length} ПЗ</span>
                                        </Tooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center p-8 text-brand-text-muted">
                    <p>Нет активных производственных заданий для расчета потребностей.</p>
                </div>
            )}
        </div>
    );
};

export default MaterialRequirementsView;
