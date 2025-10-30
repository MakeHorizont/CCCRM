import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PurchaseRequest, PurchaseRequestStatus } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import Input from '../UI/Input';
import { CalculatorIcon, PlusCircleIcon, MagnifyingGlassIcon, FunnelIcon, TableCellsIcon, ArchiveBoxIcon as ViewArchiveIcon } from '../UI/Icons';
import { PURCHASE_REQUEST_STATUS_COLOR_MAP, ROUTE_PATHS } from '../../constants';
import { useView } from '../../hooks/useView';

type ViewMode = 'active' | 'archived';

const ALL_PURCHASE_STATUSES: PurchaseRequestStatus[] = [
    'Черновик', 'Требует утверждения', 'Утверждено', 'Заказано', 'Частично получено', 'Получено', 'Отклонено'
];

// Mobile Card Component
const MobilePurchaseRequestCard: React.FC<{
  req: PurchaseRequest;
  onEdit: (req: PurchaseRequest) => void;
  getStatusColorClass: (status: PurchaseRequestStatus | null) => string;
}> = ({ req, onEdit, getStatusColorClass }) => {
  return (
    <Card className={`mb-3 ${req.isArchived ? 'opacity-70 bg-brand-surface' : ''}`} onClick={() => onEdit(req)}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-grow min-w-0">
          <h3 className="font-semibold text-brand-text-primary truncate" title={req.name}>{req.name}</h3>
          <p className="text-xs text-brand-text-muted">Заявка #{req.id}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColorClass(req.status)}`}>
            {req.status}
        </span>
      </div>
      <p className="text-xs text-brand-text-muted">Создана: {new Date(req.createdAt).toLocaleDateString()}</p>
      <p className="text-xs text-brand-text-muted">Автор: {req.createdBy.userName}</p>
      <p className="text-xs text-brand-text-muted">Позиций: {req.items.length}</p>
    </Card>
  );
};


const PurchasingPage: React.FC = () => {
  const { user } = useAuth();
  const { isMobileView } = useView();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseRequestStatus | 'Все'>('Все');

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getPurchaseRequests({ searchTerm, statusFilter, viewMode });
      setRequests(data);
    } catch (err) {
      setError(`Не удалось загрузить заявки на закупку.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, searchTerm, statusFilter, viewMode]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleNavigateToEditor = (req: PurchaseRequest) => {
    navigate(`${ROUTE_PATHS.PURCHASING}/${req.id}`);
  };

  const getStatusColorClass = (status: PurchaseRequestStatus | null): string => {
    if (!status) return PURCHASE_REQUEST_STATUS_COLOR_MAP['default'];
    return PURCHASE_REQUEST_STATUS_COLOR_MAP[status] || PURCHASE_REQUEST_STATUS_COLOR_MAP['default'];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary mb-4 sm:mb-0 flex items-center">
          <CalculatorIcon className="h-8 w-8 mr-3 text-brand-primary" />
          Заявки на Закупку
        </h1>
        <div className="flex space-x-3 w-full sm:w-auto">
          <Button
            onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')}
            variant="secondary"
            leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}
            disabled={isLoading}
            fullWidth={isMobileView}
          >
            {viewMode === 'active' ? 'Архив' : 'Активные'}
          </Button>
          {viewMode === 'active' && (
            <Button onClick={() => navigate(`${ROUTE_PATHS.PURCHASING}/new`)} variant="primary" fullWidth={isMobileView}>
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Создать Заявку
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            id="purchasing-search"
            type="text"
            placeholder="Поиск по ID, названию, товару..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<MagnifyingGlassIcon className="h-5 w-5 text-brand-text-muted"/>}
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <FunnelIcon className="h-5 w-5 text-brand-text-muted" />
            </span>
            <select
              id="purchasing-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PurchaseRequestStatus | 'Все')}
              className="w-full pl-10 pr-4 py-2.5 bg-brand-card border border-brand-border rounded-lg focus:ring-1 focus:ring-sky-500 text-brand-text-primary placeholder-brand-text-muted"
            >
              <option value="Все">Все статусы</option>
              {ALL_PURCHASE_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
        {error && <p className="text-red-500 text-center p-4">{error}</p>}
        
        {!isLoading && !error && (
          requests.length > 0 ? (
            isMobileView ? (
              <div className="space-y-3">
                {requests.map(req => (
                  <MobilePurchaseRequestCard
                    key={req.id}
                    req={req}
                    onEdit={handleNavigateToEditor}
                    getStatusColorClass={getStatusColorClass}
                  />
                ))}
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-brand-text-secondary">
                <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                  <tr>
                    <th scope="col" className="px-4 py-3">ID / Название</th>
                    <th scope="col" className="px-6 py-3">Статус</th>
                    <th scope="col" className="px-6 py-3">Позиций</th>
                    <th scope="col" className="px-6 py-3">Создана</th>
                    <th scope="col" className="px-6 py-3">Связанное ПЗ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-brand-secondary cursor-pointer" onClick={() => handleNavigateToEditor(req)}>
                      <td className="px-4 py-4 font-medium text-brand-text-primary">
                          <p>{req.name}</p>
                          <p className="text-xs text-brand-text-muted">{req.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColorClass(req.status)}`}>
                            {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{req.items.length}</td>
                      <td className="px-6 py-4">
                        <p>{new Date(req.createdAt).toLocaleDateString('ru-RU')}</p>
                        <p className="text-xs text-brand-text-muted">{req.createdBy.userName || req.createdBy.userId}</p>
                      </td>
                      <td className="px-6 py-4">{req.relatedProductionOrderId || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )
          ) : (
            <div className="text-center p-8 text-brand-text-muted">
              <TableCellsIcon className="h-12 w-12 mx-auto mb-2" />
              <p>Заявки на закупку не найдены.</p>
            </div>
          )
        )}
      </Card>
    </div>
  );
};

export default PurchasingPage;