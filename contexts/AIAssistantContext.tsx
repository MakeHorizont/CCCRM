import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { apiService } from '../services/apiService';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isLoading?: boolean;
}

interface AIAssistantContextType {
  isModalOpen: boolean;
  toggleModal: () => void;
  conversation: Message[];
  sendMessage: (text: string) => void;
  isLoading: boolean;
}

export const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const AIAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleModal = useCallback(() => {
    setIsModalOpen(prev => !prev);
    if (!isModalOpen && conversation.length === 0) {
      // Add initial greeting when opening for the first time
      setConversation([{
        id: `ai-${Date.now()}`,
        text: 'Здравствуйте! Я ваш AI-ассистент. Чем могу помочь в работе с системой CCCRM?',
        sender: 'ai',
      }]);
    }
  }, [isModalOpen, conversation.length]);
  
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: `user-${Date.now()}`, text, sender: 'user' };
    const aiPlaceholder: Message = { id: `ai-${Date.now() + 1}`, text: '', sender: 'ai', isLoading: true };

    setConversation(prev => [...prev, userMessage, aiPlaceholder]);
    setIsLoading(true);

    try {
      const stream = await apiService.getAIAssistantResponseStream(text);
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk.text;
        setConversation(prev =>
          prev.map(msg =>
            msg.id === aiPlaceholder.id ? { ...msg, text: fullText } : msg
          )
        );
      }
      
      setConversation(prev =>
        prev.map(msg =>
          msg.id === aiPlaceholder.id ? { ...msg, isLoading: false } : msg
        )
      );

    } catch (error) {
      console.error("AI Assistant Error:", error);
      const errorMessage = "К сожалению, произошла ошибка. Пожалуйста, попробуйте еще раз позже.";
       setConversation(prev =>
        prev.map(msg =>
          msg.id === aiPlaceholder.id ? { ...msg, text: errorMessage, isLoading: false } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);


  return (
    <AIAssistantContext.Provider value={{ isModalOpen, toggleModal, conversation, sendMessage, isLoading }}>
      {children}
    </AIAssistantContext.Provider>
  );
};