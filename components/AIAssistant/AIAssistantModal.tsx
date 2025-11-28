import React, { useState, useRef, useEffect } from 'react';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { Message } from '../../contexts/AIAssistantContext';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';
import { PaperAirplaneIcon, SparklesIcon } from '../UI/Icons';
import LoadingSpinner from '../UI/LoadingSpinner';

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-3 py-2 rounded-2xl ${isUser ? 'bg-sky-500 text-white rounded-br-none' : 'bg-brand-secondary text-brand-text-primary rounded-bl-none'}`}>
        {message.isLoading ? (
          <div className="flex items-center space-x-1 p-1">
            <span className="h-1.5 w-1.5 bg-current rounded-full animate-pulse [animation-delay:-0.3s]"></span>
            <span className="h-1.5 w-1.5 bg-current rounded-full animate-pulse [animation-delay:-0.15s]"></span>
            <span className="h-1.5 w-1.5 bg-current rounded-full animate-pulse"></span>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        )}
      </div>
    </div>
  );
};


const AIAssistantModal: React.FC = () => {
  const { isModalOpen, toggleModal, conversation, sendMessage, isLoading } = useAIAssistant();
  const [userInput, setUserInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(userInput);
    setUserInput('');
  };

  if (!isModalOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={toggleModal}
      title="AI Ассистент"
      size="lg"
      zIndex="z-[80]"
    >
      <div className="flex flex-col h-[60vh]">
        <div className="flex-grow overflow-y-auto pr-2 space-y-4 custom-scrollbar-thin">
          {conversation.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="mt-4 pt-4 border-t border-brand-border">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <Input
              id="ai-user-input"
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Спросите что-нибудь о CCCRM..."
              className="flex-grow"
              disabled={isLoading}
              autoComplete="off"
            />
            <Button type="submit" isLoading={isLoading} disabled={!userInput.trim()}>
              <PaperAirplaneIcon className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
       <style>{`.custom-scrollbar-thin::-webkit-scrollbar { width: 6px; } .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }`}</style>
    </Modal>
  );
};

export default AIAssistantModal;