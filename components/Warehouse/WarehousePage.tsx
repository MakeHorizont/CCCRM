
import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Import1CModal from './Import1CModal';
import InventoryCheckModal from './InventoryCheckModal';
import { WarehouseItem } from '../../types';
import { apiService } from '../../services/apiService';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import {
    PlusCircleIcon, TableCellsIcon, MagnifyingGlassIcon, ArrowUturnLeftIcon, TrashIcon,
    ChevronUpIcon, ChevronDownIcon, ArchiveBoxIcon as ViewArchiveIcon,
    ArrowsUpDownIcon, CogIcon, PencilSquareIcon, ArrowDownTrayIcon, ClipboardDocumentCheckIcon, QrCodeIcon
} from '../UI/Icons';
import Input from '../UI/Input';
import { useView } from '../../hooks/useView';
import MobileWarehouseItemCard from './MobileWarehouseItemCard';
import Tooltip from '../UI/Tooltip';
import { ROUTE_PATHS } from '../../constants';
import { downloadCSV } from '../../utils/exportUtils';
import ScannerModal from '../UI/ScannerModal';

type SortableWarehouseKeys = keyof WarehouseItem | 'history'; 
type SortDirection = 'asc' | 'desc';
type ViewMode = 'active' | 'archived';


const WarehousePage: React.FC = () => {
  const { isMobileView } = useView(); 
  const navigate = useNavigate();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('active');

  const [sortConfig, setSortConfig] = useState<{ key: SortableWarehouseKeys | null; direction: SortDirection }>({ key: 'name', direction: 'asc' });

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const itemsData = await apiService.getWarehouseItems({ searchTerm, viewMode });
      setItems(itemsData);
    } catch (err) {
      setError(`Не удалось загрузить данные склада (${viewMode === 'active' ? 'активные' : 'архивные'}).`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, viewMode]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);
  
  const handleExportCSV = () => {
      const dataToExport = items.map(item => ({
          ID: item.id,
          Название: item.name,
          SKU: item.sku,
          Количество: item.quantity,
          Цена: item.price,
          Расположение: item.locationName || item.location,
          Описание: item.description || '',
          Обновлено: new Date(item.lastUpdated).toLocaleString('ru-RU'),
          Архив: item.isArchived ? 'Да' : 'Нет'
      }));
      
      downloadCSV(dataToExport, `warehouse_export_${new Date().toISOString().split('T')[0]}.csv`, 'Экспорт реестра склада');
  };

  const columns: { label: string; key: SortableWarehouseKeys, minWidth?: string, className?: string, responsive?: boolean }[] = [
    { label: 'Название', key: 'name', minWidth: '150px', responsive: true },
    { label: 'SKU', key: 'sku', minWidth: '100px', responsive: true },
    { label: 'Кол-во', key: 'quantity', minWidth: '70px', className: 'text-center sm:text-left', responsive: true },
    { label: 'Цена', key: 'price', minWidth: '80px', className: 'text-center sm:text-left', responsive: true},
    { label: 'Расположение', key: 'location', minWidth: '120px', responsive: true },
    { label: 'Состав', key: 'billOfMaterials' as any, minWidth: '60px', className: 'text-center', responsive: true},
    { label: 'Описание', key: 'description', minWidth: '180px', responsive: false},
    { label: 'Обновлено', key: 'lastUpdated', minWidth: '100px', responsive: false },
  ];
  
  const requestSort = (key: SortableWarehouseKeys) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null && sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof WarehouseItem];
        const valB = b[sortConfig.key as keyof WarehouseItem];
  
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (valA! < valB!) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA! > valB!) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const handleScan = (code: string) => {
      setIsScannerOpen(false);
      setSearchTerm(code);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0">
          {viewMode === 'active' ? 'Склад' : 'Архив склада'}
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
          <Button onClick={() => setIsScannerOpen(true)} variant="secondary" leftIcon={<QrCodeIcon className="h-5 w-5" />} fullWidth={isMobileView}>Поиск по QR</Button>
          <Button onClick={handleExportCSV} variant="secondary" leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />} fullWidth={isMobileView}>Экспорт CSV</Button>
          {viewMode === 'active' && (
              <Button onClick={() => setIsInventoryModalOpen(true)} variant="secondary" leftIcon={<ClipboardDocumentCheckIcon className="h-5 w-5" />} fullWidth={isMobileView}>Инвентаризация</Button>
          )}
          <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" leftIcon={<TableCellsIcon className="h-5 w-5" />} fullWidth={isMobileView}>Импорт 1С</Button>
          <Button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} variant="secondary" leftIcon={<ViewArchiveIcon className="h-5 w-5" />} fullWidth={isMobileView}>{viewMode === 'active' ? 'Перейти в архив' : 'Активные товары'}</Button>
          {viewMode === 'active' && <Button onClick={() => navigate(`${ROUTE_PATHS.WAREHOUSE}/new`)} variant="primary" fullWidth={isMobileView}><PlusCircleIcon className="h-5 w-5 mr-2" />Добавить товар</Button>}
        </div>
      </div>
      <Card>
        <div className="mb-4">
          <Input
            id="warehouse-search-input"
            type="text"
            placeholder="Поиск по названию, SKU или QR-коду..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted" />}
          />
        </div>
        {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
        {error && <p className="text-red-500 text-center p-4">{error}</p>}
        {!isLoading && !error && (
          sortedItems.length > 0 ? (
            isMobileView ? (
              <div>
                {sortedItems.map(item => (
                  <MobileWarehouseItemCard 
                    key={item.id} 
                    item={item} 
                    onOpen={() => navigate(`${ROUTE_PATHS.WAREHOUSE}/${item.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-brand-text-secondary">
                  <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                    <tr>
                      {columns.map(col => (
                        <th key={String(col.key)} scope="col" className={`px-4 py-3 cursor-pointer ${col.className || ''} ${col.responsive === false ? 'hidden lg:table-cell' : ''}`} style={{ minWidth: col.minWidth }} onClick={() => requestSort(col.key as SortableWarehouseKeys)}>
                          {col.label}
                          {sortConfig?.key === col.key ? (sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 inline ml-1" /> : <ChevronDownIcon className="h-4 w-4 inline ml-1" />) : <ArrowsUpDownIcon className="h-4 w-4 inline ml-1 opacity-30" />}
                        </th>
                      ))}
                      <th scope="col" className="px-4 py-3 text-center" style={{ minWidth: '100px' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {sortedItems.map(item => (
                       <tr key={item.id} className="hover:bg-brand-secondary cursor-pointer" onClick={() => navigate(`${ROUTE_PATHS.WAREHOUSE}/${item.id}`)}>
                         <td className="px-4 py-3 font-medium text-brand-text-primary whitespace-nowrap">{item.name}</td>
                         <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">{item.sku}</td>
                         <td className="px-4 py-3 whitespace-nowrap text-center sm:text-left">{item.quantity}</td>
                         <td className="px-4 py-3 whitespace-nowrap text-center sm:text-left">₽{item.price}</td>
                         <td className="px-4 py-3 whitespace-nowrap">{item.locationName || item.location}</td>
                         <td className="px-4 py-3 text-center">
                           {item.billOfMaterials && item.billOfMaterials.length > 0 ? <CogIcon className="h-5 w-5 mx-auto text-sky-400" /> : '-'}
                         </td>
                         <td className="px-4 py-3 truncate max-w-xs hidden lg:table-cell" title={item.description}>{item.description || '-'}</td>
                         <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                         <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                           <Tooltip text="Редактировать"><Button variant="ghost" size="sm" onClick={() => navigate(`${ROUTE_PATHS.WAREHOUSE}/${item.id}`)}><PencilSquareIcon className="h-5 w-5" /></Button></Tooltip>
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
      </Card>
      
      <Import1CModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={fetchPageData} />
      <InventoryCheckModal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} onComplete={fetchPageData} />
      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScan} />
      
      <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 3px; }
        .dark .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #52525b; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
        .dark .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #71717a; }
      `}</style>
    </div>
  );
};

export default WarehousePage;
