
import React, { useState, useEffect } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { QualityCheck, QualityCheckStatus, QualityParameter } from '../../types';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '../UI/Icons';

interface QualityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  check: QualityCheck;
  onResolve: (id: string, result: { status: QualityCheckStatus, notes?: string, parameters: { id: string, actualValue: string, passed: boolean }[] }) => Promise<void>;
  isSaving: boolean;
}

const QualityCheckModal: React.FC<QualityCheckModalProps> = ({ isOpen, onClose, check, onResolve, isSaving }) => {
  const [parameters, setParameters] = useState<QualityParameter[]>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && check) {
      // Initialize state with check data, defaulting passed to true if undefined
      setParameters(check.parameters.map(p => ({
          ...p,
          actualValue: p.actualValue || '',
          passed: p.passed !== undefined ? p.passed : true
      })));
      setNotes(check.notes || '');
      setError(null);
    }
  }, [isOpen, check]);

  const handleParamChange = (id: string, field: keyof QualityParameter, value: any) => {
    setParameters(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSubmit = () => {
    // Validation logic
    // 1. If any CRITICAL parameter is NOT passed -> Overall FAIL
    // 2. If many non-critical are failed -> Conditional or Fail (logic can be manual)
    
    const criticalFail = parameters.some(p => p.isCritical && !p.passed);
    let proposedStatus: QualityCheckStatus = criticalFail ? 'failed' : 'passed';
    
    // If manual override needed, user can change it, but here we auto-suggest based on params
    if (!criticalFail && parameters.some(p => !p.passed)) {
        proposedStatus = 'conditional';
    }
    
    onResolve(check.id, {
        status: proposedStatus,
        notes,
        parameters: parameters.map(p => ({ id: p.id, actualValue: p.actualValue || '', passed: p.passed || false }))
    });
  };
  
  const isReadOnly = check.status !== 'pending';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Проверка качества ${check.checkNumber}`} size="lg">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-brand-secondary p-2 rounded-md">
            <div>
                <p className="text-sm font-medium text-brand-text-primary">{check.relatedEntityName}</p>
                <p className="text-xs text-brand-text-muted uppercase tracking-wider">{check.type}</p>
            </div>
            <div className={`px-2 py-1 rounded text-sm font-bold ${
                check.status === 'passed' ? 'bg-emerald-100 text-emerald-700' :
                check.status === 'failed' ? 'bg-red-100 text-red-700' :
                check.status === 'conditional' ? 'bg-amber-100 text-amber-700' :
                'bg-zinc-200 text-zinc-700'
            }`}>
                {check.status.toUpperCase()}
            </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar-thin">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-brand-text-muted uppercase bg-brand-surface sticky top-0">
                    <tr>
                        <th className="px-2 py-2">Параметр</th>
                        <th className="px-2 py-2">Норма</th>
                        <th className="px-2 py-2 w-1/3">Факт</th>
                        <th className="px-2 py-2 text-center">Статус</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                    {parameters.map(param => (
                        <tr key={param.id} className={!param.passed ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                            <td className="px-2 py-2 font-medium">
                                {param.name}
                                {param.isCritical && (
                                    <span title="Критический параметр">
                                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500 inline ml-1"/>
                                    </span>
                                )}
                            </td>
                            <td className="px-2 py-2 text-brand-text-secondary">{param.normativeValue}</td>
                            <td className="px-2 py-2">
                                <Input 
                                    id={`actual-${param.id}`} 
                                    value={param.actualValue || ''} 
                                    onChange={e => handleParamChange(param.id, 'actualValue', e.target.value)}
                                    disabled={isReadOnly || isSaving}
                                    className="!p-1 text-sm"
                                    placeholder="Значение..."
                                />
                            </td>
                            <td className="px-2 py-2 text-center">
                                <button 
                                    onClick={() => !isReadOnly && handleParamChange(param.id, 'passed', !param.passed)}
                                    disabled={isReadOnly || isSaving}
                                    className={`p-1 rounded-full transition-colors ${param.passed ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50'}`}
                                >
                                    {param.passed ? <CheckCircleIcon className="h-6 w-6"/> : <XCircleIcon className="h-6 w-6"/>}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        <div>
            <label className="block text-sm font-medium text-brand-text-primary mb-1">Заключение инспектора</label>
            <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                rows={3} 
                className="w-full bg-brand-card border border-brand-border rounded-lg p-2 text-sm"
                placeholder="Дополнительные комментарии..."
                disabled={isReadOnly || isSaving}
            />
        </div>

        {!isReadOnly && (
             <div className="flex justify-end space-x-3 pt-2 border-t border-brand-border">
                <Button variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
                <Button onClick={handleSubmit} isLoading={isSaving} variant="primary">Завершить проверку</Button>
            </div>
        )}
         {isReadOnly && (
             <div className="flex justify-end pt-2 border-t border-brand-border">
                <Button variant="secondary" onClick={onClose}>Закрыть</Button>
            </div>
        )}
      </div>
    </Modal>
  );
};

export default QualityCheckModal;
