import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AppSettingsContextType {
  isAIAssistantEnabled: boolean;
  toggleAIAssistant: () => void;
}

export const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAIAssistantEnabled, setIsAIAssistantEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem('isAIAssistantEnabled');
      // Default to false if not set
      setIsAIAssistantEnabled(storedValue === 'true');
    } catch (e) {
      console.error("Failed to load AI Assistant setting from localStorage", e);
      setIsAIAssistantEnabled(false);
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

  if (isLoading) {
      return null; // Or a loading spinner for the whole app
  }

  return (
    <AppSettingsContext.Provider value={{ isAIAssistantEnabled, toggleAIAssistant }}>
      {children}
    </AppSettingsContext.Provider>
  );
};
