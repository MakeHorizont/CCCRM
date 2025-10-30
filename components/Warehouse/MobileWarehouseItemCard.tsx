import React from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';
import { WarehouseItem, HouseholdItemUsage } from '../../types';
import {
    PencilSquareIcon, ArchiveBoxArrowDownIcon, ArrowUturnLeftIcon, TrashIcon,
    Cog6ToothIcon as CogIcon, ExclamationTriangleIcon
} from '../UI/Icons';

interface MobileWarehouseItemCardProps {
  item: WarehouseItem & { locationName?: string };
  onOpen: (item: WarehouseItem) => void;
}

const MobileWarehouseItemCard: React.FC<MobileWarehouseItemCardProps> = ({ item, onOpen }) => {
  const getBomTooltipText = (bom: HouseholdItemUsage[] | undefined): string => {
    if (!bom || bom.length === 0) return "Состав не указан";
    const bomStrings = bom.map(i => `- ${i.householdItemName} (${i.quantityPerUnit} ${i.unit})`);
    return `Состав:\n${bomStrings.join('\n')}`;
  };

  return (
    <Card className={`mb-3 ${item.isArchived ? 'opacity-70 bg-brand-surface' : ''}`} onClick={() => onOpen(item)}>
      <div className="flex justify-between items-start">
        <div className="flex-grow min-w-0 flex items-center">
           {item.openIncidentsCount && item.openIncidentsCount > 0 && (
              <Tooltip text={`Активных инцидентов: ${item.openIncidentsCount}`}>
                <span className="mr-2"><ExclamationTriangleIcon className="h-5 w-5 text-orange-400"/></span>
              </Tooltip>
           )}
          <div>
            <h3 className="font-semibold text-brand-text-primary truncate" title={item.name}>{item.name}</h3>
            <p className="text-xs text-brand-text-muted">SKU: {item.sku}</p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-2">
            {item.billOfMaterials && item.billOfMaterials.length > 0 && (
                <Tooltip text={getBomTooltipText(item.billOfMaterials)}>
                    <span className="inline-block"><CogIcon className="h-5 w-5 text-sky-400" /></span>
                </Tooltip>
            )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-brand-text-muted">Количество</p>
          <p className="font-medium flex items-center">
            {item.quantity} шт.
            {item.lowStockThreshold !== undefined && item.quantity <= item.lowStockThreshold && (
                <Tooltip text={`Низкий остаток! Порог: ${item.lowStockThreshold}`}>
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 ml-2"/>
                </Tooltip>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-brand-text-muted">Цена</p>
          <p className="font-medium">₽{item.price.toLocaleString('ru-RU')}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-brand-text-muted">Расположение</p>
          <p className="font-medium truncate">{item.locationName || '-'}</p>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-brand-border flex justify-end space-x-2" onClick={e => e.stopPropagation()}>
        <Button size="sm" variant="ghost" onClick={() => onOpen(item)}><PencilSquareIcon className="h-5 w-5 mr-1" /> Открыть</Button>
      </div>
    </Card>
  );
};

export default MobileWarehouseItemCard;