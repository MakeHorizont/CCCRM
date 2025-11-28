
import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar'; 
import { useLocation } from 'react-router-dom';
import { useView } from '../hooks/useView';
import MobileHomePage from './MobileHomePage';
import { ROUTE_PATHS } from '../constants';
import AIAssistantButton from './AIAssistant/AIAssistantButton';
import AIAssistantModal from './AIAssistant/AIAssistantModal';
import { useAppSettings } from '../hooks/useAppSettings';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isMobileView } = useView();
  const { isAIAssistantEnabled } = useAppSettings();
  const location = useLocation();
  
  // Hide layout for login page
  if (location.pathname === ROUTE_PATHS.LOGIN) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-brand-background text-brand-text-primary">
      {!isMobileView && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className={`flex-1 overflow-x-hidden overflow-y-auto bg-brand-surface ${isMobileView ? 'p-2' : 'p-6'}`}>
          {isMobileView ? (
            (location.pathname === '/') 
              ? <MobileHomePage /> 
              : children
          ) : (
            children
          )}
        </main>
      </div>
      {isAIAssistantEnabled && (
        <>
          <AIAssistantButton />
          <AIAssistantModal />
        </>
      )}
    </div>
  );
};

export default Layout;