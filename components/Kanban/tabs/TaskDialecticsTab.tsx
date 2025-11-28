import React, { useState } from 'react';
import { KanbanTask, StageEntry, TaskStage } from '../../../types';
import Button from '../../UI/Button';
import MarkdownDisplay from '../../UI/MarkdownDisplay';

interface TaskDialecticsTabProps {
    taskData: Partial<KanbanTask>;
    onAddEntry: (stage: 'potential' | 'contradictions' | 'solution', text: string) => Promise<void>;
    isSaving: boolean;
}

const StageColumn: React.FC<{
    title: string;
    entries: StageEntry[];
    onAdd: (text: string) => Promise<void>;
    isSaving: boolean;
}> = ({ title, entries, onAdd, isSaving }) => {
    const [newEntryText, setNewEntryText] = useState('');

    const handleAdd = async () => {
        if (!newEntryText.trim()) return;
        await onAdd(newEntryText);
        setNewEntryText('');
    };

    return (
        <div className="flex flex-col space-y-2 bg-brand-surface p-3 rounded-lg h-full">
            <h4 className="font-semibold text-brand-text-primary border-b border-brand-border pb-1">{title}</h4>
            <div className="flex-grow space-y-2 overflow-y-auto custom-scrollbar-thin pr-1">
                {entries.length > 0 ? entries.map(entry => (
                    <div key={entry.id} className="p-2 bg-brand-card rounded-md border border-brand-border/50">
                        <MarkdownDisplay markdown={entry.text} className="text-sm"/>
                        <p className="text-xs text-brand-text-muted mt-1 text-right">
                            {entry.userName} - {new Date(entry.timestamp).toLocaleDateString()}
                        </p>
                    </div>
                )) : <p className="text-xs text-brand-text-muted italic text-center py-4">Нет записей.</p>}
            </div>
            <div className="flex-shrink-0 pt-2 border-t border-brand-border">
                <textarea
                    value={newEntryText}
                    onChange={e => setNewEntryText(e.target.value)}
                    placeholder="Добавить запись (Markdown)..."
                    rows={3}
                    className="w-full text-sm p-2 bg-brand-card border border-brand-border rounded-md"
                    disabled={isSaving}
                />
                <Button onClick={handleAdd} isLoading={isSaving} disabled={!newEntryText.trim()} size="sm" className="mt-1">
                    Добавить
                </Button>
            </div>
        </div>
    );
};


const TaskDialecticsTab: React.FC<TaskDialecticsTabProps> = ({ taskData, onAddEntry, isSaving }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[60vh]">
            <StageColumn
                title="Потенциал"
                entries={taskData.taskStagePotentialHistory || []}
                onAdd={(text) => onAddEntry('potential', text)}
                isSaving={isSaving}
            />
            <StageColumn
                title="Противоречия"
                entries={taskData.taskStageContradictionsHistory || []}
                onAdd={(text) => onAddEntry('contradictions', text)}
                isSaving={isSaving}
            />
            <StageColumn
                title="Решение"
                entries={taskData.taskStageSolutionHistory || []}
                onAdd={(text) => onAddEntry('solution', text)}
                isSaving={isSaving}
            />
            <style>{`.custom-scrollbar-thin::-webkit-scrollbar { width: 6px; } .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }`}</style>
        </div>
    );
};

export default TaskDialecticsTab;