

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  error?: string;
  icon?: React.ReactNode; // For icons inside the input
  smallLabel?: boolean; // New prop for smaller label
}

const Input: React.FC<InputProps> = ({ label, id, error, icon, className, smallLabel, ...props }) => {
  const hasIcon = !!icon;
  
  const labelBaseClasses = "block font-medium text-brand-text-primary";
  const labelSizeClasses = smallLabel ? "text-xs mb-0.5" : "text-sm mb-1";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className={`${labelBaseClasses} ${labelSizeClasses}`}>
          {label}
        </label>
      )}
      <div className="relative">
        {hasIcon && (
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             {icon}
            </span>
        )}
        <input
          id={id}
          className={`block w-full ${hasIcon ? 'pl-10' : 'px-3'} py-2 bg-zinc-50 dark:bg-zinc-700/50 border border-brand-border rounded-lg shadow-sm placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-700 sm:text-sm text-brand-text-primary disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Input;