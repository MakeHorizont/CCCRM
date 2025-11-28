import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type SystemMode = 'development' | 'mobilization';

interface AppSettingsContextType {
  isAIAssistantEnabled: boolean;
  toggleAIAssistant: () => void;
  systemMode: SystemMode;
  setSystemMode: (mode: SystemMode) => void;
}

export const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAIAssistantEnabled, setIsAIAssistantEnabled] = useState<boolean>(false);
  const [systemMode, setSystemModeState] = useState<SystemMode>('development');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedAI = localStorage.getItem('isAIAssistantEnabled');
      setIsAIAssistantEnabled(storedAI === 'true');
      
      const storedMode = localStorage.getItem('systemMode') as SystemMode | null;
      if (storedMode === 'mobilization' || storedMode === 'development') {
          setSystemModeState(storedMode);
      }
    } catch (e) {
      console.error("Failed to load settings from localStorage", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const toggleAIAssistant = useCallback(() => {
    setIsAIAssistantEnabled(prev => {
      const newValue = !prev;
      try {
        localStorage.setItem('isAIAssistantEnabled', String(newValue));
      } catch (e) {
        console.error("Failed to save AI Assistant setting to localStorage", e);
      }
      return newValue;
    });
  }, []);
  
  const setSystemMode = useCallback((mode: SystemMode) => {
      setSystemModeState(mode);
      try {
          localStorage.setItem('systemMode', mode);
      } catch (e) {
          console.error("Failed to save System Mode to localStorage", e);
      }
  }, []);

  if (isLoading) {
      return null; 
  }

  return (
    <AppSettingsContext.Provider value={{ isAIAssistantEnabled, toggleAIAssistant, systemMode, setSystemMode }}>
      {children}
    </AppSettingsContext.Provider>
  );
};