
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDragLeave?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
  id?: string; // Added id prop
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick, onDragOver, onDragLeave, onDrop, id }) => {
  return (
    <div
      id={id} // Pass id to the div
      className={`bg-brand-card border border-brand-border rounded-xl p-4 sm:p-6 ${onClick ? 'cursor-pointer hover:bg-zinc-50 transition-colors' : ''} ${className}`}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
};

export default Card;