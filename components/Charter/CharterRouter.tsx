import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { FlagIcon, ArrowTrendingUpIcon } from '../UI/Icons';
import StaticMarkdownPage from './StaticMarkdownPage';

const CharterRouter: React.FC = () => {

  const getTabClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      isActive
        ? 'border-brand-primary text-brand-primary'
        : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-brand-text-primary flex items-center">
          <FlagIcon className="h-8 w-8 mr-3 text-brand-primary"/>
          Устав Коллектива
        </h1>
      </div>
      
      <p className="text-brand-text-secondary max-w-3xl">
          Этот раздел содержит основополагающие документы, определяющие идеологию, принципы работы и стратегию развития нашего коллектива как производственной ячейки, строящейся на социалистических принципах.
      </p>

      <div className="border-b border-brand-border">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <NavLink to="main" className={getTabClass}>
            <FlagIcon className="h-5 w-5 mr-2" />
            <span>Устав CCCRM</span>
          </NavLink>
          <NavLink to="evolution" className={getTabClass}>
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
            <span>Этапы Модернизации</span>
          </NavLink>
        </nav>
      </div>

      <div className="mt-4">
        <Routes>
          <Route path="main" element={<StaticMarkdownPage source="charter" />} />
          <Route path="evolution" element={<StaticMarkdownPage source="evolution" />} />
          <Route index element={<Navigate to="main" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default CharterRouter;
