import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import ConfirmationModal from '../UI/ConfirmationModal';
import LoadingSpinner from '../UI/LoadingSpinner';
import { HouseholdItem, HouseholdCategory } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusCircleIcon, PencilSquareIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon, TrashIcon, MagnifyingGlassIcon, FunnelIcon, TableCellsIcon, ArchiveBoxIcon as ViewArchiveIcon, ExclamationTriangleIcon, XMarkIcon, ShoppingCartIcon, CircleStackIcon } from '../UI/Icons';
import { HOUSEHOLD_CATEGORIES, ROUTE_PATHS } from '../../constants';
import Tooltip from '../UI/Tooltip';
import { useView } from '../../hooks/useView';
import { useNavigate } from 'react-router-dom';
import MaterialRequirementsView from './MaterialRequirementsView';

type StockViewMode = 'active' | 'archived';
type ActiveTab = 'stock' | 'mrp';

// Mobile Card Component for Stock
const MobileHouseholdItemCard: React.FC<{
  item: HouseholdItem;
  onView: (item: HouseholdItem) => void;
}> = ({ item, onView }) => {
  return (
    <Card className={`mb-3 ${item.isArchived ? 'opacity-70 bg-brand-surface' : ''}`} onClick={() => onView(item)}>
      <div className="flex justify-between items-start">
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-brand-text-primary truncate" title={item.name}>{item.name}</h3>
          <p className="text-xs text-brand-text-muted">{item.category}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-brand-text-muted">Количество</p>
          <p className="font-medium flex items-center">
            {item.quantity} {item.unit}
            {item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold && (
                <Tooltip text={`Низкий остаток! Порог: ${item.lowStockThreshold}`}>
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 ml-2"/>
                </Tooltip>
            )}
            </p>
        </div>
         {item.notes && (
            <div className="col-span-2">
                <p className="text-xs text-brand-text-muted">Заметка</p>
                <p className="font-medium truncate">{item.notes}</p>
            </div>
         )}
      </div>
    </Card>
  );
};


const HouseholdAccountingPage: React.FC = () => {
  const { isMobileView } = useView(); 
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('stock');
  const [viewMode, setViewMode] = useState<StockViewMode>('active');

  const [items, setItems] = useState<HouseholdItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HouseholdCategory | 'Все'>('Все');
  
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = {
        viewMode,
        searchTerm: searchTerm || undefined,
        category: categoryFilter === 'Все' ? undefined : categoryFilter,
      };
      const data = await apiService.getHouseholdItems(filters);
      setItems(data);
    } catch (err) {
      setError(`Не удалось загрузить ${viewMode === 'active' ? 'активные' : 'архивные'} хоз. товары.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, searchTerm, categoryFilter]);
  
  useEffect(() => {
    if (activeTab === 'stock') {
        fetchItems();
    }
  }, [fetchItems, activeTab]);

  const columns = [
    { label: 'Название', key: 'name', minWidth: '180px', responsive: true },
    { label: 'Категория', key: 'category', minWidth: '130px', responsive: true },
    { label: 'Кол-во', key: 'quantity', minWidth: '80px', className: 'text-center sm:text-left', responsive: true },
    { label: 'Ед. изм.', key: 'unit', minWidth: '70px', responsive: true },
    { label: 'Заметки', key: 'notes', minWidth: '180px', responsive: false },
    { label: 'Обновлено', key: 'lastUpdated', minWidth: '100px', responsive: false },
  ];
  
  const tabButtonStyle = (tabName: ActiveTab) =>
    `px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 transition-colors whitespace-nowrap flex items-center ` +
    (activeTab === tabName
      ? 'border-sky-500 text-sky-400 bg-brand-card'
      : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0">
          Хозяйственный Учёт
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button
            onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
            variant="secondary"
            leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}
            fullWidth className="sm:w-auto"
          >
            {viewMode === 'active' ? 'Архив' : 'Актуальное'}
          </Button>
          {viewMode === 'active' && (
            <Button onClick={() => navigate(`${ROUTE_PATHS.HOUSEHOLD_ACCOUNTING}/new`)} variant="primary" fullWidth className="sm:w-auto">
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Добавить позицию
            </Button>
          )}
        </div>
      </div>
      
       <div className="border-b border-brand-border">
            <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                <button onClick={() => setActiveTab('stock')} className={tabButtonStyle('stock')}>
                   <CircleStackIcon className="h-5 w-5 mr-2"/> Остатки
                </button>
                <button onClick={() => setActiveTab('mrp')} className={tabButtonStyle('mrp')}>
                   <ShoppingCartIcon className="h-5 w-5 mr-2"/> Потребности (MRP)
                </button>
            </nav>
        </div>


      <Card>
        {activeTab === 'stock' && (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
                id="household-search-input"
                type="text"
                placeholder="Поиск по названию, заметкам..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
            />
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <FunnelIcon className="h-5 w-5 text-brand-text-muted" />
                </span>
                <select
                    id="household-category-filter"
                    name="categoryFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as HouseholdCategory | 'Все')}
                    className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-brand-text-primary placeholder-brand-text-muted"
                >
                    <option value="Все">Все категории</option>
                    {HOUSEHOLD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            </div>
            
            {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
            {error && <p className="text-red-500 text-center p-4">{error}</p>}
            
            {!isLoading && !error && (
            items.length > 0 ? (
                isMobileView ? (
                <div>
                    {items.map(item => (
                    <MobileHouseholdItemCard
                        key={item.id}
                        item={item}
                        onView={(item) => navigate(`${ROUTE_PATHS.HOUSEHOLD_ACCOUNTING}/${item.id}`)}
                    />
                    ))}
                </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-brand-text-secondary">
                    <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                        <tr>
                        {columns.map(col => (
                            <th key={col.key} scope="col" className={`px-4 py-3 ${col.className || ''} ${col.responsive === false ? 'hidden md:table-cell' : ''}`} style={{minWidth: col.minWidth}}>
                                {col.label}
                            </th>
                        ))}
                        <th scope="col" className="px-4 py-3 text-center" style={{minWidth: '100px'}}>Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {items.map((item) => (
                        <tr key={item.id} className={`hover:bg-brand-secondary transition-colors cursor-pointer ${item.isArchived ? 'opacity-70' : ''}`} onClick={() => navigate(`${ROUTE_PATHS.HOUSEHOLD_ACCOUNTING}/${item.id}`)}>
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-brand-text-primary">{item.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{item.category}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-center sm:text-left">
                            <div className="flex items-center">
                                <span>{item.quantity}</span>
                                {item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold && (
                                    <Tooltip text={`Низкий остаток! Порог: ${item.lowStockThreshold}`}>
                                        <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 ml-2"/>
                                    </Tooltip>
                                )}
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{item.unit}</td>
                            <td className="px-4 py-3 truncate max-w-sm hidden md:table-cell" title={item.notes || ''}>{item.notes || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">{new Date(item.lastUpdated).toLocaleDateString('ru-RU')}</td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1">
                                <Tooltip text="Редактировать"><Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTE_PATHS.HOUSEHOLD_ACCOUNTING}/${item.id}`)} aria-label="Редактировать"><PencilSquareIcon className="h-5 w-5" /></Button></Tooltip>
                            </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )
            ) : (
                <div className="text-center p-8 text-brand-text-muted">
                <TableCellsIcon className="h-12 w-12 mx-auto mb-2" />
                <p>{viewMode === 'active' ? 'Товары не найдены.' : 'Архивные товары не найдены.'}</p>
                </div>
            )
            )}
        </>
        )}

        {activeTab === 'mrp' && (
            <MaterialRequirementsView />
        )}
      </Card>

      <style>{`.custom-scrollbar-thin::-webkit-scrollbar {width: 6px;} .custom-scrollbar-thin::-webkit-scrollbar-track {background: transparent;} .custom-scrollbar-thin::-webkit-scrollbar-thumb {background: #3f3f46; border-radius: 3px;} .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {background: #52525b;}`}</style>
    </div>
  );
};

export default HouseholdAccountingPage;