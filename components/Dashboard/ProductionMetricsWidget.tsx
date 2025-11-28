
import React from 'react';
import Card from '../UI/Card';
import { ProductionMetrics } from '../../types';
import { CogIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

interface ProductionMetricsWidgetProps {
  metrics: ProductionMetrics;
}

const ProductionMetricsWidget: React.FC<ProductionMetricsWidgetProps> = ({ metrics }) => {
  const { totalPlannedItems, totalProducedItems, efficiency, activeOrdersCount, delayedOrdersCount } = metrics;
  
  let efficiencyColor = 'bg-sky-500';
  if (efficiency >= 90) efficiencyColor = 'bg-emerald-500';
  else if (efficiency < 70) efficiencyColor = 'bg-red-500';
  else efficiencyColor = 'bg-amber-500'; // 70-89%

  return (
    <Card className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-brand-text-primary flex items-center">
           <CogIcon className="h-6 w-6 mr-2 text-brand-primary"/>
           Производственный Пульс
        </h2>
        <div className="text-xs text-brand-text-muted bg-brand-secondary px-2 py-1 rounded-md">
            Активных ПЗ: <strong>{activeOrdersCount}</strong>
        </div>
      </div>
      
      <div className="flex-grow flex flex-col justify-center space-y-6">
         {/* Efficiency Bar */}
         <div>
             <div className="flex justify-between text-sm mb-1 font-medium">
                 <span className="text-brand-text-secondary">Выполнение плана (ед.)</span>
                 <span className={efficiency >= 90 ? 'text-emerald-500' : efficiency < 70 ? 'text-red-500' : 'text-amber-500'}>{efficiency}%</span>
             </div>
             <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-4 relative overflow-hidden">
                 <div className={`h-4 rounded-full ${efficiencyColor} transition-all duration-1000`} style={{ width: `${Math.min(100, efficiency)}%` }}></div>
                  {/* Stripe effect for "in progress" feel */}
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[spin_3s_linear_infinite]"></div>
             </div>
             <div className="flex justify-between text-xs mt-1 text-brand-text-muted">
                 <span>Факт: {totalProducedItems}</span>
                 <span>План: {totalPlannedItems}</span>
             </div>
         </div>

         {/* Status Blocks */}
         <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${delayedOrdersCount > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'}`}>
                <p className="text-xs text-brand-text-secondary mb-1">Отставание</p>
                <p className={`text-xl font-bold ${delayedOrdersCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {delayedOrdersCount} <span className="text-sm font-normal">заказов</span>
                </p>
            </div>
             <div className="p-3 rounded-lg border bg-brand-surface border-brand-border">
                <p className="text-xs text-brand-text-secondary mb-1">Загрузка</p>
                <Tooltip text="Отношение произведенного к общему плану">
                     <p className="text-xl font-bold text-brand-text-primary">
                        {totalProducedItems} / {totalPlannedItems}
                    </p>
                </Tooltip>
            </div>
         </div>
      </div>
    </Card>
  );
};

export default ProductionMetricsWidget;
