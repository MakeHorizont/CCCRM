import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../constants';
import { CircleStackIcon, HeartIcon } from '../UI/Icons';
import CollectiveFundOverviewPage from './CollectiveFundOverviewPage';
import SocialProgramsPage from '../SocialPrograms/SocialProgramsPage';

const CollectiveFundRouter: React.FC = () => {

  const getTabClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      isActive
        ? 'border-brand-primary text-brand-primary'
        : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary">Коллективный Фонд</h1>
      </div>
      
      <p className="text-brand-text-secondary max-w-3xl">
          Этот раздел посвящен управлению общественными средствами предприятия. Здесь можно отслеживать баланс фонда, просматривать историю транзакций, а также выдвигать и поддерживать социальные инициативы, направленные на улучшение жизни коллектива.
      </p>

      <div className="border-b border-brand-border">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <NavLink to={ROUTE_PATHS.COLLECTIVE_FUND_OVERVIEW} className={getTabClass}>
            <CircleStackIcon className="h-5 w-5 mr-2" />
            <span>Обзор Фонда</span>
          </NavLink>
          <NavLink to={ROUTE_PATHS.COLLECTIVE_FUND_INITIATIVES} className={getTabClass}>
            <HeartIcon className="h-5 w-5 mr-2" />
            <span>Социальные Инициативы</span>
          </NavLink>
        </nav>
      </div>

      <div className="mt-4">
        <Routes>
          <Route path="overview" element={<CollectiveFundOverviewPage />} />
          <Route path="initiatives" element={<SocialProgramsPage />} />
          <Route index element={<Navigate to="overview" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default CollectiveFundRouter;