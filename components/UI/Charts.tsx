
import React from 'react';
import Tooltip from './Tooltip';

interface DataPoint {
  label: string;
  value: number;
  tooltip?: string;
}

interface ChartProps {
  data: DataPoint[];
  height?: number;
  className?: string;
  color?: string;
  valueFormatter?: (val: number) => string;
}

export const BarChart: React.FC<ChartProps> = ({ 
  data, 
  height = 200, 
  className = '', 
  color = 'bg-sky-500',
  valueFormatter = (v) => v.toString()
}) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-end space-x-2 w-full" style={{ height: `${height}px` }}>
        {data.map((point, index) => {
          const heightPercent = (point.value / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center group relative">
               <Tooltip text={`${point.label}: ${point.tooltip || valueFormatter(point.value)}`}>
                  <div className="w-full flex items-end justify-center h-full relative">
                      <div 
                        className={`w-4/5 rounded-t-sm transition-all duration-500 ease-out ${color} opacity-80 group-hover:opacity-100`} 
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                  </div>
               </Tooltip>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 px-2 border-t border-brand-border pt-1">
        {data.map((point, index) => (
          <div key={index} className="flex-1 text-center">
             <span className="text-[10px] text-brand-text-muted block truncate px-1" title={point.label}>
               {point.label}
             </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface LineChartProps extends ChartProps {
    showArea?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
    data,
    height = 200,
    className = '',
    color = 'text-sky-500',
    valueFormatter = (v) => v.toString(),
    showArea = true
}) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue;
    
    // Generate SVG path
    const points = data.map((point, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((point.value - minValue) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,100 ${points} 100,100`;

    // Tailwind color extraction for stroke/fill is tricky dynamically, so we use inline styles or specific classes.
    // Simplified for CSS variables.
    const strokeColor = "currentColor"; 

    return (
        <div className={`relative ${className} ${color}`} style={{ height: `${height}px` }}>
             <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Grid lines (Horizontal) */}
                <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeOpacity="0.1" vectorEffect="non-scaling-stroke" />

                {showArea && (
                     <polygon points={areaPoints} fill="currentColor" fillOpacity="0.1" />
                )}
                <polyline 
                    points={points} 
                    fill="none" 
                    stroke={strokeColor} 
                    strokeWidth="2" 
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                
                {/* Points */}
                {data.map((point, index) => {
                    const x = (index / (data.length - 1)) * 100;
                    const y = 100 - ((point.value - minValue) / range) * 100;
                    return (
                        <g key={index} className="group">
                            <circle cx={x} cy={y} r="3" vectorEffect="non-scaling-stroke" className="fill-brand-surface stroke-current transition-all group-hover:r-5"/>
                             {/* Simple foreignObject tooltip attempt, or rely on container hovering */}
                            <title>{`${point.label}: ${valueFormatter(point.value)}`}</title>
                        </g>
                    );
                })}
            </svg>
            <div className="flex justify-between mt-2 text-[10px] text-brand-text-muted absolute w-full top-full">
                 <span>{data[0]?.label}</span>
                 <span>{data[data.length - 1]?.label}</span>
            </div>
        </div>
    );
};
