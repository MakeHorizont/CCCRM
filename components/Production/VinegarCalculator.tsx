import React from 'react';

// Ratio from user: 27g of 70% vinegar for 28000g of boiled soy.
const VINEGAR_70_RATIO = 27 / 28000; // g of vinegar per g of soy

// Ratio from user: 300g of 9% vinegar for 28000g of boiled soy.
const VINEGAR_9_RATIO = 300 / 28000; // g of vinegar per g of soy

interface VinegarCalculatorProps {
  soyWeightGrams: number;
  vinegarType: '70%' | '9%';
  className?: string;
}

const VinegarCalculator: React.FC<VinegarCalculatorProps> = ({ soyWeightGrams, vinegarType, className = '' }) => {
  if (soyWeightGrams <= 0) {
    return null;
  }

  const ratio = vinegarType === '70%' ? VINEGAR_70_RATIO : VINEGAR_9_RATIO;
  const vinegarAmount = soyWeightGrams * ratio;

  return (
    <div className={`p-2 bg-sky-900/40 border border-sky-700/50 rounded-md text-sm ${className}`}>
      <p className="text-sky-300">
        <span className="font-semibold">Расчет для {vinegarType} уксуса:</span> на{' '}
        <strong className="text-white">{(soyWeightGrams / 1000).toFixed(2)} кг</strong> варёной сои требуется
        добавить <strong className="text-white">{vinegarAmount.toFixed(1)} гр.</strong> уксуса.
      </p>
    </div>
  );
};

export default VinegarCalculator;