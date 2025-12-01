
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { MenuItem } from '../constants'; 
import { MENU_ITEMS_FOR_MOBILE_NAV, MobileNavItemConfig } from '../constants'; 

interface ViewContextType {
  isMobileView: boolean;
  isLoading: boolean;
  toggleViewMode: () => void;
  mobileNavItemsConfig: MobileNavItemConfig[];
  setMobileNavItemsConfig: (newConfig: MobileNavItemConfig[]) => void;
  isMobileNavLocked: boolean;
  toggleMobileNavLock: () => void;
  resetMobileNavSettings: () => void;
  
  // Global Search
  isGlobalSearchOpen: boolean;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
}

export const ViewContext = createContext<ViewContextType | undefined>(undefined);

interface ViewProviderProps {
  children: React.ReactNode;
}

const MOBILE_BREAKPOINT = 768;

const getDefaultMobileNavConfig = (): MobileNavItemConfig[] => {
  return MENU_ITEMS_FOR_MOBILE_NAV.map(item => ({
    id: item.id,
    label: item.label,
    iconName: item.iconName,
    path: item.path,
    isVisible: true, // Default all to visible
  }));
};


export const ViewProvider: React.FC<ViewProviderProps> = ({ children }) => {
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [mobileNavItemsConfig, setMobileNavItemsConfigState] = useState<MobileNavItemConfig[]>([]);
  const [isMobileNavLocked, setIsMobileNavLockedState] = useState<boolean>(false);

  // Global Search State
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  useEffect(() => {
    const storedViewMode = localStorage.getItem('ccrmViewMode');
    let initialIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
    if (storedViewMode) {
      initialIsMobile = storedViewMode === 'mobile';
    }
    setIsMobileView(initialIsMobile);

    // Load mobile nav settings
    const storedNavConfig = localStorage.getItem('ccrmMobileNavConfig');
    const storedNavLock = localStorage.getItem('ccrmMobileNavLocked');
    
    if (storedNavConfig) {
      try {
        const parsedConfig = JSON.parse(storedNavConfig) as MobileNavItemConfig[];
        // Ensure all items from constants are present, add if missing, preserve order/visibility if present
        const defaultConfig = getDefaultMobileNavConfig();
        const finalConfig = defaultConfig.map(defaultItem => {
            const savedItem = parsedConfig.find(saved => saved.id === defaultItem.id);
            return savedItem ? { ...defaultItem, ...savedItem } : defaultItem; // Merge, prioritizing saved visibility
        });
        // Preserve order of saved items if possible, then add new items
        const orderedFinalConfig = parsedConfig
            .map(savedItem => finalConfig.find(item => item.id === savedItem.id))
            .filter(item => item !== undefined) as MobileNavItemConfig[];
        
        defaultConfig.forEach(defaultItem => {
            if (!orderedFinalConfig.some(item => item.id === defaultItem.id)) {
                orderedFinalConfig.push(defaultItem);
            }
        });
        setMobileNavItemsConfigState(orderedFinalConfig);

      } catch (e) {
        console.error("Failed to parse mobileNavItemsConfig from localStorage", e);
        setMobileNavItemsConfigState(getDefaultMobileNavConfig());
      }
    } else {
      setMobileNavItemsConfigState(getDefaultMobileNavConfig());
    }

    setIsMobileNavLockedState(storedNavLock === 'true');
    setIsLoading(false);

    const handleResize = () => {
      const currentStoredView = localStorage.getItem('ccrmViewMode');
      if (!currentStoredView) {
        setIsMobileView(window.innerWidth < MOBILE_BREAKPOINT);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleViewMode = useCallback(() => {
    setIsMobileView(prev => {
      const newView = !prev;
      localStorage.setItem('ccrmViewMode', newView ? 'mobile' : 'desktop');
      return newView;
    });
  }, []);

  const setMobileNavItemsConfig = useCallback((newConfig: MobileNavItemConfig[]) => {
    setMobileNavItemsConfigState(newConfig);
    localStorage.setItem('ccrmMobileNavConfig', JSON.stringify(newConfig));
  }, []);

  const toggleMobileNavLock = useCallback(() => {
    setIsMobileNavLockedState(prev => {
      const newLockState = !prev;
      localStorage.setItem('ccrmMobileNavLocked', String(newLockState));
      return newLockState;
    });
  }, []);
  
  const resetMobileNavSettings = useCallback(() => {
    const defaultConfig = getDefaultMobileNavConfig();
    setMobileNavItemsConfigState(defaultConfig);
    localStorage.setItem('ccrmMobileNavConfig', JSON.stringify(defaultConfig));
    setIsMobileNavLockedState(false);
    localStorage.setItem('ccrmMobileNavLocked', 'false');
  }, []);
  
  const openGlobalSearch = useCallback(() => setIsGlobalSearchOpen(true), []);
  const closeGlobalSearch = useCallback(() => setIsGlobalSearchOpen(false), []);


  return (
    <ViewContext.Provider value={{ 
        isMobileView, 
        isLoading, 
        toggleViewMode,
        mobileNavItemsConfig,
        setMobileNavItemsConfig,
        isMobileNavLocked,
        toggleMobileNavLock,
        resetMobileNavSettings,
        isGlobalSearchOpen,
        openGlobalSearch,
        closeGlobalSearch
    }}>
      {children}
    </ViewContext.Provider>
  );
};
