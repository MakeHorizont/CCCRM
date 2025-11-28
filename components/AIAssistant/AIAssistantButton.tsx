import React from 'react';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { SparklesIcon } from '../UI/Icons';
import Tooltip from '../UI/Tooltip';

const AIAssistantButton: React.FC = () => {
  const { toggleModal } = useAIAssistant();

  return (
    <Tooltip text="AI Ассистент" position="left">
      <button
        onClick={toggleModal}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-brand-primary text-brand-primary-text shadow-lg hover:bg-opacity-90 transform hover:scale-110 transition-transform duration-200 ease-in-out flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-background focus:ring-brand-primary"
        aria-label="Открыть AI Ассистент"
      >
        <SparklesIcon className="h-7 w-7" />
      </button>
    </Tooltip>
  );
};

export default AIAssistantButton;