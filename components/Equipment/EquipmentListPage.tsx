import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import ConfirmationModal from '../UI/ConfirmationModal';
import { EquipmentItem, SortableEquipmentKeys, EquipmentStatus } from '../../types';
import { apiService } from '../../services/apiService';
import {
    PlusCircleIcon, MagnifyingGlassIcon, PencilSquareIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon,
    TrashIcon, DocumentDuplicateIcon, ArchiveBoxIcon as ViewArchiveIcon, CubeIcon, ArrowsUpDownIcon, ChevronUpIcon, ChevronDownIcon
} from '../UI/Icons';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUS_COLOR_MAP } from '../../constants';
import Tooltip from '../UI/Tooltip';
import { useView } from '../../hooks/useView';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants';


type ViewMode = 'active' | 'archived';
type SortDirection = 'asc' | 'desc';

const statusLabels: Record<EquipmentStatus, string> = {
    operational: 'Свободно',
    in_use: 'Используется',
    maintenance: 'Обслуживание',
    broken: 'Неисправно'
};

const MobileEquipmentCard: React.FC<{
  item: EquipmentItem;
  onView: (item: EquipmentItem) => void;
  onArchiveToggle: (item: EquipmentItem) => void;
  onDeleteInitiate: (item: EquipmentItem) => void;
  onDuplicate: (item: EquipmentItem) => void;
}> = ({ item, onView, onArchiveToggle, onDeleteInitiate, onDuplicate }) => (
  <Card className={`mb-3 ${item.isArchived ? 'opacity-70 bg-brand-surface' : ''}`} onClick={() => onView(item)}>
    <div className="flex justify-between items-start">
        <h3 className="font-semibold text-brand-text-primary truncate flex-grow" title={item.name}>{item.name}</h3>
        {item.status && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${EQUIPMENT_STATUS_COLOR_MAP[item.status]}`}>
                {statusLabels[item.status]}
            </span>
        )}
    </div>
    <p className="text-xs text-brand-text-muted mt-1">{item.category}</p>
    <div className="text-sm mt-2">
        <p><strong className="text-brand-text-secondary">Стоимость:</strong> {item.amortization.cost.toLocaleString('ru-RU')} ₽</p>
        <p><strong className="text-brand-text-secondary">Амортизация:</strong> {item.amortization.amortizationPercentage}% от дохода</p>
    </div>
    <div className="mt-3 pt-2 border-t border-brand-border flex justify-end space-x-1" onClick={e => e.stopPropagation()}>
      <Button size="sm" variant="ghost" onClick={() => onView(item)}><PencilSquareIcon className="h-5 w-5 mr-1" /> Открыть</Button>
      {!item.isArchived && (
          <Button size="sm" variant="ghost" onClick={() => onDuplicate(item)}>
              <DocumentDuplicateIcon className="h-5 w-5 mr-1"/> Дублировать
          </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => onArchiveToggle(item)}>
        {item.isArchived ? <><ArrowUturnLeftIcon className="h-5 w-5 mr-1"/>Восст.</> : <><ArchiveBoxArrowDownIcon className="h-5 w-5 mr-1"/>Архив</>}
      </Button>
      {item.isArchived && (
        <Button size="sm" variant="danger" onClick={() => onDeleteInitiate(item)}>
            <TrashIcon className="h-5 w-5"/>
        </Button>
      )}
    </div>
  </Card>
);

const EquipmentListPage: React.FC = () => {
    const { isMobileView } = useView();
    const location = useLocation();
    const navigate = useNavigate();

    const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableEquipmentKeys, direction: SortDirection } | null>({ key: 'name', direction: 'asc' });

    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<EquipmentItem | null>(null);

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<EquipmentItem | null>(null);

    const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
    const [itemToDuplicate, setItemToDuplicate] = useState<EquipmentItem | null>(null);


    const fetchEquipment = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiService.getEquipmentItems({ searchTerm, viewMode });
            setEquipment(data);
            return data;
        } catch (err) {
            setError(`Не удалось загрузить данные об оборудовании.`);
            console.error(err);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, viewMode]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const equipId = params.get('equipId');

        fetchEquipment().then(fetchedEquipment => {
            if (equipId && fetchedEquipment.length > 0) {
                const itemToView = fetchedEquipment.find(eq => eq.id === equipId);
                if (itemToView) {
                    handleOpenEditor(itemToView);
                    navigate(ROUTE_PATHS.EQUIPMENT, { replace: true });
                }
            }
        });
    }, [fetchEquipment, location.search, navigate]);
    
    const handleOpenEditor = (item?: EquipmentItem) => {
        const path = item ? `${ROUTE_PATHS.EQUIPMENT}/${item.id}` : `${ROUTE_PATHS.EQUIPMENT}/new`;
        navigate(path);
    };

    const handleDuplicateInitiate = (item: EquipmentItem) => {
        setItemToDuplicate(item);
        setIsDuplicateConfirmOpen(true);
    };

    const handleConfirmDuplicate = async () => {
        if (!itemToDuplicate) return;
        setIsLoading(true);
        setIsDuplicateConfirmOpen(false);
        try {
            await apiService.duplicateEquipmentItem(itemToDuplicate.id);
            await fetchEquipment();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
            setItemToDuplicate(null);
        }
    }

    const handleArchiveInitiate = (item: EquipmentItem) => {
        setItemToArchive(item);
        setIsArchiveConfirmOpen(true);
    };

    const handleConfirmArchive = async () => {
        if (!itemToArchive) return;
        setIsLoading(true);
        setIsArchiveConfirmOpen(false);
        try {
            await apiService.archiveEquipmentItem(itemToArchive.id, !itemToArchive.isArchived);
            await fetchEquipment();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
            setItemToArchive(null);
        }
    };

    const handleDeleteInitiate = (item: EquipmentItem) => {
        if (item.isArchived) {
            setItemToDelete(item);
            setIsDeleteConfirmOpen(true);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return;
        setIsLoading(true);
        setIsDeleteConfirmOpen(false);
        try {
            await apiService.deleteEquipmentItem(itemToDelete.id);
            await fetchEquipment();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
            setItemToDelete(null);
        }
    };
    
    const requestSort = (key: SortableEquipmentKeys) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedEquipment = useMemo(() => {
        let sortableItems = [...equipment];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let valA: string | number | undefined;
                let valB: string | number | undefined;

                if (sortConfig.key === 'cost') {
                    valA = a.amortization.cost;
                    valB = b.amortization.cost;
                } else if (sortConfig.key === 'amortizationPercentage') {
                    valA = a.amortization.amortizationPercentage;
                    valB = b.amortization.amortizationPercentage;
                } else if (sortConfig.key === 'status') {
                    valA = a.status;
                    valB = b.status;
                } else {
                    valA = a[sortConfig.key as 'name' | 'category'];
                    valB = b[sortConfig.key as 'name' | 'category'];
                }
                
                if (valA === undefined) return 1;
                if (valB === undefined) return -1;
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [equipment, sortConfig]);
    
    const getSortIcon = (key: SortableEquipmentKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
          return <ArrowsUpDownIcon className="h-4 w-4 inline ml-1 opacity-40" />;
        }
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 inline ml-1" /> : <ChevronDownIcon className="h-4 w-4 inline ml-1" />;
    };

    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
                <CubeIcon className="h-8 w-8 mr-3 text-brand-primary" />
                Оборудование
            </h1>
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <p className="text-brand-text-secondary text-sm mb-4 sm:mb-0 max-w-2xl">
                    Учет основного и вспомогательного оборудования, его стоимости, амортизации и связанной документации.
                </p>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <Button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} variant="secondary" leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}>
                        {viewMode === 'active' ? 'Архив' : 'Активное'}
                    </Button>
                    {viewMode === 'active' && (
                        <Button onClick={() => handleOpenEditor()} variant="primary">
                            <PlusCircleIcon className="h-5 w-5 mr-2" />
                            Добавить Оборудование
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <div className="mb-4">
                    <Input
                        id="equipment-search"
                        type="text"
                        placeholder="Поиск по названию, категории, описанию..."
                        value={searchTerm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-8"><LoadingSpinner /></div>
                ) : error ? (
                    <p className="text-red-500 text-center p-4">{error}</p>
                ) : sortedEquipment.length > 0 ? (
                  isMobileView ? (
                    <div className="space-y-3">
                      {sortedEquipment.map(item => (
                        <MobileEquipmentCard
                          key={item.id}
                          item={item}
                          onView={handleOpenEditor}
                          onArchiveToggle={handleArchiveInitiate}
                          onDeleteInitiate={handleDeleteInitiate}
                          onDuplicate={handleDuplicateInitiate}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                         <table className="w-full text-sm text-left text-brand-text-secondary">
                            <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                                <tr>
                                    <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('name')}>Название {getSortIcon('name')}</th>
                                    <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('category')}>Категория {getSortIcon('category')}</th>
                                    <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('status')}>Статус {getSortIcon('status')}</th>
                                    <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('cost')}>Стоимость {getSortIcon('cost')}</th>
                                    <th scope="col" className="px-4 py-3 cursor-pointer" onClick={() => requestSort('amortizationPercentage')}>Амортизация (% от дохода) {getSortIcon('amortizationPercentage')}</th>
                                    <th scope="col" className="px-4 py-3 text-center">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {sortedEquipment.map(item => (
                                    <tr key={item.id} className="hover:bg-brand-secondary cursor-pointer" onClick={() => handleOpenEditor(item)}>
                                        <td className="px-4 py-3 font-medium text-brand-text-primary">{item.name}</td>
                                        <td className="px-4 py-3">{item.category}</td>
                                        <td className="px-4 py-3">
                                            {item.status ? (
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${EQUIPMENT_STATUS_COLOR_MAP[item.status]}`}>
                                                    {statusLabels[item.status]}
                                                    {item.status === 'in_use' && item.currentProductionOrderId && 
                                                        <Tooltip text={`Задействовано в ПЗ: ${item.currentProductionOrderId}`}>
                                                            <Link to={`${ROUTE_PATHS.PRODUCTION}?orderId=${item.currentProductionOrderId}`} onClick={e => e.stopPropagation()} className="ml-1 text-current hover:underline">
                                                                ({item.currentProductionOrderId})
                                                            </Link>
                                                        </Tooltip>
                                                    }
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3">{item.amortization.cost.toLocaleString('ru-RU')} ₽</td>
                                        <td className="px-4 py-3">{item.amortization.amortizationPercentage} %</td>
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center space-x-1">
                                                <Tooltip text="Редактировать"><Button variant="ghost" size="sm" onClick={() => handleOpenEditor(item)}><PencilSquareIcon className="h-5 w-5"/></Button></Tooltip>
                                                {!item.isArchived && <Tooltip text="Дублировать"><Button variant="ghost" size="sm" onClick={() => handleDuplicateInitiate(item)}><DocumentDuplicateIcon className="h-5 w-5"/></Button></Tooltip>}
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
                        <CubeIcon className="h-12 w-12 mx-auto mb-2" />
                        <p>{viewMode === 'active' ? 'Оборудование не добавлено.' : 'В архиве нет оборудования.'}</p>
                    </div>
                )}
            </Card>

            {isDuplicateConfirmOpen && itemToDuplicate && (
                 <ConfirmationModal
                    isOpen={isDuplicateConfirmOpen}
                    onClose={() => setIsDuplicateConfirmOpen(false)}
                    onConfirm={handleConfirmDuplicate}
                    title="Подтвердить дублирование"
                    message={<p>Создать копию оборудования <strong className="text-brand-text-primary">{itemToDuplicate.name}</strong>?</p>}
                    confirmText="Да, создать копию"
                    isLoading={isLoading}
                />
            )}

            {isArchiveConfirmOpen && itemToArchive && (
                 <ConfirmationModal
                    isOpen={isArchiveConfirmOpen}
                    onClose={() => setIsArchiveConfirmOpen(false)}
                    onConfirm={handleConfirmArchive}
                    title={itemToArchive.isArchived ? "Восстановить оборудование?" : "Архивировать оборудование?"}
                    message={<p>Вы уверены, что хотите {itemToArchive.isArchived ? 'восстановить' : 'архивировать'} <strong className="text-brand-text-primary">{itemToArchive.name}</strong>?</p>}
                    confirmText={itemToArchive.isArchived ? "Восстановить" : "Архивировать"}
                    confirmButtonVariant={itemToArchive.isArchived ? "primary" : "danger"}
                    isLoading={isLoading}
                />
            )}

            {isDeleteConfirmOpen && itemToDelete && (
                <ConfirmationModal
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={handleDeleteConfirm}
                    title="Подтвердите удаление"
                    message={<p>Вы уверены, что хотите окончательно удалить оборудование <strong className="text-brand-text-primary">{itemToDelete.name}</strong>? Это действие необратимо.</p>}
                    confirmText="Удалить"
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

export default EquipmentListPage;