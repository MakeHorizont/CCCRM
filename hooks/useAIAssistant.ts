import { useContext } from 'react';
import { AIAssistantContext } from '../contexts/AIAssistantContext';

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};