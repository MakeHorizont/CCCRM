import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MENU_ITEMS, LOGOUT_MENU_ITEM } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { ChevronDownIcon, ChevronRightIcon } from './UI/Icons'; 

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleSubMenu = (itemName: string) => {
    setOpenSubMenus(prev => ({ ...prev, [itemName]: !prev[itemName] }));
  };

  const commonLinkClasses = "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out";
  const activeLinkClasses = "bg-zinc-200 dark:bg-zinc-700 text-brand-text-primary font-semibold";
  const inactiveLinkClasses = "text-brand-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-700/50 hover:text-brand-text-primary";
  
  const commonSubLinkClasses = "flex items-center pl-11 pr-4 py-2.5 text-xs font-medium rounded-lg transition-colors duration-150 ease-in-out";


  const filteredMenuItems = MENU_ITEMS.filter(item => {
    if (!user) return false;
    if (item.requiredRole && user.role !== item.requiredRole) {
        return false;
    }
    if (item.requiredPermission && (!user.permissions || !user.permissions.includes(item.requiredPermission))) {
        if (user.role !== 'ceo') return false;
    }
    return true;
  });


  return (
    <div className="w-64 bg-brand-background flex flex-col border-r border-brand-border">
      {/* Sidebar Header */}
      <div className="flex items-center h-16 px-4 border-b border-brand-border">
        <span className="text-xl font-semibold text-brand-text-primary">CCCRM</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
           if (item.isHeader) {
            return (
              <div key={item.name} className="px-3 pt-4 pb-2">
                <span className="text-xs font-semibold uppercase text-brand-text-muted tracking-wider">{item.name}</span>
              </div>
            );
          }

          return item.isParent && item.subMenu ? (
            <div key={item.name}>
              <button
                onClick={() => toggleSubMenu(item.name)}
                className={`${commonLinkClasses} w-full justify-between ${
                  item.subMenu.some(subItem => location.pathname === subItem.path) 
                    ? activeLinkClasses 
                    : inactiveLinkClasses
                }`}
              >
                <div className="flex items-center">
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.name}</span>
                </div>
                {openSubMenus[item.name] || item.subMenu.some(subItem => location.pathname === subItem.path) ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
              </button>
              {(openSubMenus[item.name] || item.subMenu.some(subItem => location.pathname === subItem.path)) && (
                <div className="mt-1 space-y-1">
                  {item.subMenu.map((subItem) => (
                    <NavLink
                      key={subItem.name}
                      to={subItem.path}
                      className={({ isActive }) =>
                        `${commonSubLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                      }
                    >
                      {subItem.icon && <subItem.icon className="h-4 w-4 mr-3" />}
                       <span>{subItem.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <NavLink
              key={item.name}
              to={item.path!}
              className={({ isActive }) =>
                `${commonLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
              }
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="px-3 py-4 mt-auto border-t border-brand-border">
        {user && (
          <div className="mb-3 px-1">
            <p className="text-xs font-medium text-brand-text-primary truncate">{user.name || user.email}</p>
            <p className="text-xs text-brand-text-muted truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`${commonLinkClasses} w-full ${inactiveLinkClasses}`}
        >
          <LOGOUT_MENU_ITEM.icon className="h-5 w-5 mr-3" />
          <span>{LOGOUT_MENU_ITEM.name}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;