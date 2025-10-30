import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  tooltipClassName?: string; // Additional class for the tooltip bubble itself
}

const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top', className = '', tooltipClassName = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const arrowBaseClasses = 'absolute w-2 h-2 bg-zinc-800 dark:bg-zinc-100 transform rotate-45';

  const arrowPositionClasses = {
    top: `bottom-[-4px] left-1/2 -translate-x-1/2`,
    bottom: `top-[-4px] left-1/2 -translate-x-1/2`,
    left: `right-[-4px] top-1/2 -translate-y-1/2`,
    right: `left-[-4px] top-1/2 -translate-y-1/2`,
  };

  const updatePosition = useCallback(() => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const spacing = 8; 

      let newTop = 0;
      let newLeft = 0;

      switch (position) {
        case 'top':
          newTop = triggerRect.top + scrollY - tooltipRect.height - spacing;
          newLeft = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'bottom':
          newTop = triggerRect.bottom + scrollY + spacing;
          newLeft = triggerRect.left + scrollX + (triggerRect.width / 2) - (tooltipRect.width / 2);
          break;
        case 'left':
          newTop = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
          newLeft = triggerRect.left + scrollX - tooltipRect.width - spacing;
          break;
        case 'right':
          newTop = triggerRect.top + scrollY + (triggerRect.height / 2) - (tooltipRect.height / 2);
          newLeft = triggerRect.right + scrollX + spacing;
          break;
      }
      
      // Boundary checks
      newLeft = Math.max(spacing, Math.min(newLeft, window.innerWidth - tooltipRect.width - spacing));
      newTop = Math.max(spacing, newTop);

      setCoords({ top: newTop, left: newLeft });
    }
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      const id = setTimeout(updatePosition, 0); // Update position on next frame
      window.addEventListener('scroll', updatePosition, true); 
      window.addEventListener('resize', updatePosition);
      return () => {
        clearTimeout(id);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);

  const portalElement = typeof document !== 'undefined' ? document.getElementById('tooltip-portal-root') : null;
  
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('tooltip-portal-root')) {
      const el = document.createElement('div');
      el.id = 'tooltip-portal-root';
      document.body.appendChild(el);
    }
  }, []);


  return (
    <div 
      ref={triggerRef} 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave} 
      className={`inline-block ${className}`}
    >
      {children}
      {isVisible && portalElement && createPortal(
        <div
          ref={tooltipRef}
          className={`fixed px-3 py-1.5 bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-800 text-xs rounded-md shadow-lg transition-opacity duration-200 pointer-events-none whitespace-normal z-[100] ${tooltipClassName}`}
          role="tooltip"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            visibility: coords.top === 0 ? 'hidden' : 'visible' // Hide until positioned
          }}
        >
          {text}
          <div className={`${arrowBaseClasses} ${arrowPositionClasses[position]}`}></div>
        </div>,
        portalElement
      )}
    </div>
  );
};

export default Tooltip;