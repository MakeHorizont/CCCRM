import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import Input from '../UI/Input';

// --- Constants based on user's table ---
// All ratios are derived from the quantity needed for one 260g piece of tempeh.
const PEELED_SOY_G_PER_PIECE = 14400 / 108; // 133.333... g
const WHOLE_TO_PEELED_RATIO = 0.84;
const WHOLE_TO_HUSK_RATIO = 0.16;
const WHOLE_TO_BOILED_RATIO = 1.638;

export interface SoyCalculatorValues {
  tempehPieces: number;
  wholeSoyG: number;
  peeledSoyG: number;
  huskG: number;
  boiledSoyG: number;
}

type CalculatorField = keyof SoyCalculatorValues;

interface SoyCalculatorProps {
  initialTempehPieces: number;
  onValuesChange: (values: SoyCalculatorValues) => void;
}

const formatNumber = (num: number) => {
    // Avoid scientific notation for small numbers and format to a reasonable precision.
    if (Math.abs(num) < 1) return parseFloat(num.toPrecision(3));
    return parseFloat(num.toFixed(1));
};

const SoyCalculator: React.FC<SoyCalculatorProps> = ({ initialTempehPieces, onValuesChange }) => {
  const [values, setValues] = useState<SoyCalculatorValues>({
    tempehPieces: 0, wholeSoyG: 0, peeledSoyG: 0, huskG: 0, boiledSoyG: 0
  });
  const [lastChanged, setLastChanged] = useState<CalculatorField | null>(null);

  // Initialize values when the component mounts or initialTempehPieces changes
  useEffect(() => {
    const pieces = initialTempehPieces || 0;
    const peeledSoyG = pieces * PEELED_SOY_G_PER_PIECE;
    const wholeSoyG = peeledSoyG / WHOLE_TO_PEELED_RATIO;
    const huskG = wholeSoyG * WHOLE_TO_HUSK_RATIO;
    const boiledSoyG = wholeSoyG * WHOLE_TO_BOILED_RATIO;
    
    const initialValues = {
        tempehPieces: formatNumber(pieces),
        wholeSoyG: formatNumber(wholeSoyG),
        peeledSoyG: formatNumber(peeledSoyG),
        huskG: formatNumber(huskG),
        boiledSoyG: formatNumber(boiledSoyG),
    };
    setValues(initialValues);
    onValuesChange(initialValues);
    setLastChanged(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTempehPieces]);

  // Recalculate all values when one changes
  const calculate = useCallback((fieldName: CalculatorField, fieldValue: number) => {
    let newValues: SoyCalculatorValues = { ...values };

    if (isNaN(fieldValue)) {
        // If input is cleared, reset all to 0
        newValues = { tempehPieces: 0, wholeSoyG: 0, peeledSoyG: 0, huskG: 0, boiledSoyG: 0 };
    } else {
        let basePeeledG = 0;
        switch(fieldName) {
            case 'tempehPieces':
                basePeeledG = fieldValue * PEELED_SOY_G_PER_PIECE;
                break;
            case 'peeledSoyG':
                basePeeledG = fieldValue;
                break;
            case 'wholeSoyG':
                basePeeledG = fieldValue * WHOLE_TO_PEELED_RATIO;
                break;
            case 'huskG':
                basePeeledG = (fieldValue / WHOLE_TO_HUSK_RATIO) * WHOLE_TO_PEELED_RATIO;
                break;
            case 'boiledSoyG':
                basePeeledG = (fieldValue / WHOLE_TO_BOILED_RATIO) * WHOLE_TO_PEELED_RATIO;
                break;
        }

        const calculatedPeeledSoyG = basePeeledG;
        const calculatedWholeSoyG = calculatedPeeledSoyG / WHOLE_TO_PEELED_RATIO;

        newValues = {
            peeledSoyG: formatNumber(calculatedPeeledSoyG),
            wholeSoyG: formatNumber(calculatedWholeSoyG),
            tempehPieces: formatNumber(calculatedPeeledSoyG / PEELED_SOY_G_PER_PIECE),
            huskG: formatNumber(calculatedWholeSoyG * WHOLE_TO_HUSK_RATIO),
            boiledSoyG: formatNumber(calculatedWholeSoyG * WHOLE_TO_BOILED_RATIO),
        };
    }
    
    setValues(newValues);
    onValuesChange(newValues);
  }, [values, onValuesChange]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as { name: CalculatorField; value: string };
    const numValue = parseFloat(value);
    
    // Update the single field being typed into first for responsiveness
    setValues(prev => ({...prev, [name]: value}));
    setLastChanged(name);
    
    // Then trigger full calculation
    calculate(name, numValue);
  };

  const calculatorFields: { name: CalculatorField; label: string; unit: string; }[] = [
    { name: 'tempehPieces', label: 'Темпе 260гр', unit: 'шт' },
    { name: 'wholeSoyG', label: 'Цельная соя (сухая)', unit: 'гр' },
    { name: 'peeledSoyG', label: 'Чищеная соя (сухая)', unit: 'гр' },
    { name: 'boiledSoyG', label: 'Варёная соя', unit: 'гр' },
    { name: 'huskG', label: 'Шелуха', unit: 'гр' },
  ];

  return (
    <div className="space-y-3">
        <p className="text-xs text-brand-text-muted">Введите любое известное значение, остальные пересчитаются автоматически.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            {calculatorFields.map(field => (
                 <div key={field.name} className="relative">
                    <Input
                        id={`calc-${field.name}`}
                        name={field.name}
                        type="number"
                        label={field.label}
                        smallLabel
                        value={values[field.name]}
                        onChange={handleInputChange}
                        className="pr-12"
                    />
                    <span className="absolute right-3 top-[55%] -translate-y-1/2 text-xs text-brand-text-muted">{field.unit}</span>
                 </div>
            ))}
        </div>
    </div>
  );
};

export default SoyCalculator;