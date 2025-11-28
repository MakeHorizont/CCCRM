
import React, { useState } from 'react';
import { ChartPieIcon, CogIcon, BanknotesIcon } from '../UI/Icons';
import ProductionAnalyticsTab from './ProductionAnalyticsTab';
import CostAnalyticsTab from './CostAnalyticsTab';

type AnalyticsTab = 'production' | 'finance' | 'quality';

const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('production');

  const tabButtonStyle = (tabName: AnalyticsTab) =>
    `flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ` +
    (activeTab === tabName
      ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-brand-surface'
      : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
          <ChartPieIcon className="h-8 w-8 mr-3 text-brand-primary" />
          Аналитический Центр
        </h1>
      </div>

      <div className="border-b border-brand-border">
        <nav className="-mb-px flex space-x-2" aria-label="Tabs">
          <button onClick={() => setActiveTab('production')} className={tabButtonStyle('production')}>
            <CogIcon className="h-5 w-5 mr-2"/> Производство
          </button>
          <button onClick={() => setActiveTab('finance')} className={tabButtonStyle('finance')}>
            <BanknotesIcon className="h-5 w-5 mr-2"/> Экономика (Себестоимость)
          </button>
          {/* Future: Quality Tab */}
        </nav>
      </div>

      <div className="py-2">
        {activeTab === 'production' && <ProductionAnalyticsTab />}
        {activeTab === 'finance' && <CostAnalyticsTab />}
        {activeTab === 'quality' && <div className="p-8 text-center text-brand-text-muted">Раздел в разработке...</div>}
      </div>
    </div>
  );
};

export default AnalyticsPage;
