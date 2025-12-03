
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import { TechnologyCard, WarehouseItem } from '../../types';
import { apiService } from '../../services/apiService';
import { BeakerIcon, PlusCircleIcon, PencilSquareIcon, TableCellsIcon, ViewArchiveIcon } from '../UI/Icons';
import { useView } from '../../hooks/useView';
import { ROUTE_PATHS } from '../../constants';

type ViewMode = 'active' | 'archived';

const MobileTechCard: React.FC<{
  item: WarehouseItem;
  techCard?: TechnologyCard;
  onEdit: (item: WarehouseItem) => void;
}> = ({ item, techCard, onEdit }) => (
  <Card className="mb-3" onClick={() => onEdit(item)}>
    <h3 className="font-semibold text-brand-text-primary">{item.name}</h3>
    <div className="flex justify-between items-center mt-2">
      {techCard ? (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${techCard.isArchived ? 'bg-zinc-500/20 text-zinc-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {techCard.isArchived ? 'В архиве' : `Создана (Версия ${techCard.version || 1})`}
        </span>
      ) : (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-500/20 text-zinc-400">
          Отсутствует
        </span>
      )}
      <Button
        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
        variant="secondary"
        size="sm"
        leftIcon={techCard ? <PencilSquareIcon className="h-4 w-4" /> : <PlusCircleIcon className="h-4 w-4" />}
      >
        {techCard ? 'Открыть' : 'Создать'}
      </Button>
    </div>
  </Card>
);


const TechnologiesPage: React.FC = () => {
  const { isMobileView } = useView();
  const navigate = useNavigate();
  const [producibleItems, setProducibleItems] = useState<WarehouseItem[]>([]);
  const [techCards, setTechCards] = useState<Record<string, TechnologyCard>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('active');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [itemsData, cardsData] = (await Promise.all([
        apiService.getWarehouseItems({ viewMode: 'active' }), 
        apiService.getTechnologyCards({ viewMode })
      ])) as [WarehouseItem[], TechnologyCard[]];
      
      const producible = itemsData.filter(item => item.billOfMaterials && item.billOfMaterials.length > 0);
      setProducibleItems(producible);
      
      const cardsMap = (cardsData as TechnologyCard[]).reduce((acc: Record<string, TechnologyCard>, card: TechnologyCard) => {
        acc[card.warehouseItemId] = card;
        return acc;
      }, {} as Record<string, TechnologyCard>);
      setTechCards(cardsMap);

    } catch (err) {
      setError('Не удалось загрузить данные для технологий.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNavigateToEditor = (item: WarehouseItem) => {
    const existingCard = Object.values(techCards).find(tc => tc.warehouseItemId === item.id);
    const path = existingCard ? `${ROUTE_PATHS.TECHNOLOGIES}/${item.id}` : `${ROUTE_PATHS.TECHNOLOGIES}/new?warehouseItemId=${item.id}`;
    navigate(path);
  };
  
  const visibleProducibleItems = useMemo(() => {
      if (viewMode === 'archived') {
          return producibleItems.filter(item => techCards[item.id] && techCards[item.id].isArchived);
      }
      return producibleItems.filter(item => !techCards[item.id] || !techCards[item.id].isArchived);
  }, [producibleItems, techCards, viewMode]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
          <BeakerIcon className="h-8 w-8 mr-3 text-brand-primary" />
          Технологические Карты (Рецептуры)
        </h1>
         <div className="flex space-x-3">
             <Button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} variant="secondary" leftIcon={<ViewArchiveIcon className="h-5 w-5"/>}>
                {viewMode === 'active' ? 'Архив' : 'Активные'}
            </Button>
        </div>
      </div>
      
      {isLoading && <div className="flex justify-center p-8"><LoadingSpinner /></div>}
      {error && <p className="text-red-500 text-center p-4">{error}</p>}
      
      {!isLoading && !error && (
        visibleProducibleItems.length > 0 ? (
          <Card>
            {isMobileView ? (
              <div className="space-y-3">
                {visibleProducibleItems.map(item => (
                  <MobileTechCard
                    key={item.id}
                    item={item}
                    techCard={techCards[item.id]}
                    onEdit={handleNavigateToEditor}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-brand-text-secondary">
                  <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface">
                    <tr>
                      <th scope="col" className="px-6 py-3">Продукт</th>
                      <th scope="col" className="px-6 py-3">Статус Тех. Карты</th>
                      <th scope="col" className="px-6 py-3 text-center">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {visibleProducibleItems.map(item => {
                      const card = techCards[item.id];
                      const hasCard = !!card;
                      return (
                        <tr key={item.id} className="hover:bg-brand-secondary cursor-pointer" onClick={() => handleNavigateToEditor(item)}>
                          <td className="px-6 py-4 font-medium text-brand-text-primary">{item.name}</td>
                          <td className="px-6 py-3">
                            {hasCard ? (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${card.isArchived ? 'bg-zinc-500/20 text-zinc-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {card.isArchived ? 'В архиве' : `Создана (Версия ${card.version || 1})`}
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-500/20 text-zinc-400">
                                Отсутствует
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleNavigateToEditor(item); }}
                              variant="secondary"
                              size="sm"
                              leftIcon={hasCard ? <PencilSquareIcon className="h-4 w-4" /> : <PlusCircleIcon className="h-4 w-4" />}
                            >
                              {hasCard ? 'Открыть' : 'Создать'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          <Card className="text-center p-8">
            <TableCellsIcon className="h-16 w-16 mx-auto mb-4 text-brand-text-muted" />
            <p className="text-brand-text-secondary">{viewMode === 'active' ? 'Нет товаров для создания тех. карт.' : 'Архив пуст.'}</p>
          </Card>
        )
      )}
    </div>
  );
};

export default TechnologiesPage;