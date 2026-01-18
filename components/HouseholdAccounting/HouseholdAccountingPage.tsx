
import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import { HouseholdItem, HouseholdCategory } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusCircleIcon, PencilSquareIcon, ArchiveBoxIcon as ViewArchiveIcon, ExclamationTriangleIcon, CircleStackIcon, ShoppingCartIcon, LockClosedIcon } from '../UI/Icons';
import { HOUSEHOLD_CATEGORIES, ROUTE_PATHS } from '../../constants';
import Tooltip from '../UI/Tooltip';
import { useView } from '../../hooks/useView';
import { useNavigate } from 'react-router-dom';
import MaterialRequirementsView from './MaterialRequirementsView';

type StockViewMode = 'active' | 'archived';
type ActiveTab = 'stock' | 'mrp';

const HouseholdAccountingPage: React.FC = () => {
  const { isMobileView } = useView(); 
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('stock');
  const [viewMode, setViewMode] = useState<StockViewMode>('active');
  const [items, setItems] = useState<HouseholdItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HouseholdCategory | 'Все'>('Все');
  
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getHouseholdItems({
        viewMode,
        searchTerm: searchTerm || undefined,
        category: categoryFilter === 'Все' ? undefined : categoryFilter,
      });
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, searchTerm, categoryFilter]);
  
  useEffect(() => {
    if (activeTab === 'stock') fetchItems();
  }, [fetchItems, activeTab]);

  const tabButtonStyle = (tabName: ActiveTab) =>
    `px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-t-lg border-b-2 transition-all flex items-center ` +
    (activeTab === tabName
      ? 'border-sky-500 text-sky-400 bg-brand-card shadow-sm'
      : 'border-transparent text-brand-text-muted hover:text-brand-text-primary');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-black text-brand-text-primary mb-4 sm:mb-0 flex items-center">
           <CircleStackIcon className="h-8 w-8 mr-3 text-brand-primary"/>
           ХОЗЯЙСТВЕННЫЙ УЧЁТ
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} variant="secondary" size="sm">
            {viewMode === 'active' ? 'АРХИВ' : 'АКТУАЛЬНОЕ'}
          </Button>
          {viewMode === 'active' && (
            <Button onClick={() => navigate(`${ROUTE_PATHS.HOUSEHOLD_ACCOUNTING}/new`)} variant="primary" size="sm" leftIcon={<PlusCircleIcon className="h-4 w-4"/>}>
              ДОБАВИТЬ
            </Button>
          )}
        </div>
      </div>
      
       <div className="border-b border-brand-border">
            <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                <button onClick={() => setActiveTab('stock')} className={tabButtonStyle('stock')}>
                   Остатки и Резервы
                </button>
                <button onClick={() => setActiveTab('mrp')} className={tabButtonStyle('mrp')}>
                   Потребности (MRP)
                </button>
            </nav>
        </div>

      <Card className="!p-0 overflow-hidden">
        {activeTab === 'stock' && (
        <>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-brand-surface border-b border-brand-border">
                <Input id="hh-search" placeholder="Поиск сырья..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={<CircleStackIcon className="h-5 w-5"/>}/>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} className="bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-sm">
                    <option value="Все">Все категории</option>
                    {HOUSEHOLD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            
            {isLoading ? <div className="p-12 flex justify-center"><LoadingSpinner /></div> : (
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                    <thead className="bg-brand-surface font-black uppercase text-[10px] text-brand-text-muted tracking-tighter">
                        <tr>
                            <th className="px-6 py-4">Материал</th>
                            <th className="px-6 py-4">Всего</th>
                            <th className="px-6 py-4 text-orange-500">Резерв</th>
                            <th className="px-6 py-4 text-emerald-500">Доступно</th>
                            <th className="px-6 py-4">Обновлено</th>
                            <th className="px-6 py-4 text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {items.map((item) => {
                            const available = item.quantity - (item.reservedQuantity || 0);
                            return (
                                <tr key={item.id} className="hover:bg-brand-secondary/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-brand-text-primary text-sm">{item.name}</p>
                                        <p className="text-brand-text-muted">{item.category}</p>
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold">{item.quantity} {item.unit}</td>
                                    <td className="px-6 py-4 font-mono text-orange-500 font-bold">
                                        {item.reservedQuantity || 0} {item.unit}
                                        {(item.reservedQuantity || 0) > 0 && <LockClosedIcon className="h-3 w-3 inline ml-1 opacity-50"/>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-mono font-black text-sm ${available <= (item.lowStockThreshold || 0) ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {available.toFixed(2)} {item.unit}
                                            </span>
                                            {available <= (item.lowStockThreshold || 0) && (
                                                <Tooltip text="НИЗКИЙ ОСТАТАТК: Срочно к закупке!">
                                                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500 animate-pulse"/>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-brand-text-muted">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTE_PATHS.HOUSEHOLD_ACCOUNTING}/${item.id}`)}>
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            )}
        </>
        )}
        {activeTab === 'mrp' && <MaterialRequirementsView />}
      </Card>
    </div>
  );
};

export default HouseholdAccountingPage;
