
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { DevicePhoneMobileIcon, ComputerDesktopIcon, Cog8ToothIcon, ArrowLeftIcon, SunIcon, MoonIcon } from './UI/Icons';
import { useView } from '../hooks/useView';
import { useTheme } from '../contexts/ThemeContext';
import Tooltip from './UI/Tooltip';
import Button from './UI/Button';
import MobileNavSettingsModal from './MobileNavSettingsModal';
import NotificationCenter from './NotificationCenter';
import { ROUTE_PATHS } from '../constants';

interface NavbarProps {
  // No props needed for sidebar toggle anymore
}

const Navbar: React.FC<NavbarProps> = () => {
  const { user } = useAuth();
  const { isMobileView, toggleViewMode } = useView();
  const { theme, setTheme } = useTheme();
  const [isMobileNavSettingsModalOpen, setIsMobileNavSettingsModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const showBackButton = isMobileView && location.pathname !== '/';

  const handleBackNavigation = () => {
    // Hierarchical back navigation for mobile view
    const pathParts = location.pathname.split('/').filter(p => p);
    if (pathParts.length > 0) {
        // Navigate to parent, e.g., /kanban/board/123 -> /kanban/board, or /contacts -> /
        const parentPath = '/' + pathParts.slice(0, -1).join('/');
        navigate(parentPath);
    } else {
        // Fallback to root if already at a root-level page like /contacts
        navigate('/');
    }
  };

  const handleOpenProfile = () => {
    navigate(ROUTE_PATHS.PROFILE);
  };

  return (
    <>
      <header className="h-16 bg-brand-surface border-b border-brand-border flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center">
          {showBackButton && (
            <Tooltip text="Назад" position="bottom">
              <button
                onClick={handleBackNavigation}
                className="p-2 rounded-md text-brand-text-secondary hover:text-brand-text-primary hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Назад"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            </Tooltip>
          )}
        </div>
        
        <div className="flex-1">
          {/* Can add breadcrumbs or page title here */}
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {isMobileView && (
            <Tooltip text="Настройки мобильного меню" position="bottom">
              <button
                onClick={() => setIsMobileNavSettingsModalOpen(true)}
                className="p-2 rounded-md text-brand-text-secondary hover:text-brand-text-primary hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Настройки мобильного меню"
              >
                <Cog8ToothIcon className="h-5 w-5" />
              </button>
            </Tooltip>
          )}
          <Tooltip text={theme === 'light' ? "Тёмная тема" : "Светлая тема"} position="bottom">
              <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="p-2 rounded-md text-brand-text-secondary hover:text-brand-text-primary hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  aria-label="Переключить тему"
              >
                  {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
              </button>
          </Tooltip>
          <Tooltip text={isMobileView ? "Десктопный вид" : "Мобильный вид"} position="bottom">
              <button
                  onClick={toggleViewMode}
                  className="p-2 rounded-md text-brand-text-secondary hover:text-brand-text-primary hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  aria-label={isMobileView ? "Переключить на десктопный вид" : "Переключить на мобильный вид"}
              >
                  {isMobileView ? <ComputerDesktopIcon className="h-5 w-5" /> : <DevicePhoneMobileIcon className="h-5 w-5" />}
              </button>
          </Tooltip>

          <NotificationCenter />

          {user && (
            <Button 
              onClick={handleOpenProfile} 
              variant="ghost"
              className="flex items-center space-x-2 sm:space-x-3 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
              aria-label="Открыть профиль"
            >
              <span className="text-sm text-brand-text-secondary hidden sm:block">
                {user.name || user.email}
              </span>
              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-brand-text-primary text-sm font-semibold border border-brand-border group-hover:border-brand-primary">
                {user.name ? user.name.substring(0,1).toUpperCase() : user.email.substring(0,1).toUpperCase()}
              </div>
            </Button>
          )}
        </div>
      </header>
      {isMobileView && (
        <MobileNavSettingsModal
          isOpen={isMobileNavSettingsModalOpen}
          onClose={() => setIsMobileNavSettingsModalOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;