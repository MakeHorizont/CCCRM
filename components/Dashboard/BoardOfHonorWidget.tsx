
import React from 'react';
import Card from '../UI/Card';
import { AwardIcon, SparklesIcon, ListBulletIcon } from '../UI/Icons';
import { HonorBoardEntry } from '../../types';
import { getAssigneeColor } from '../../constants';

interface BoardOfHonorWidgetProps {
  entries: HonorBoardEntry[];
}

const BoardOfHonorWidget: React.FC<BoardOfHonorWidgetProps> = ({ entries }) => {
  return (
    <Card className="h-full flex flex-col border-t-4 border-t-amber-500">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-brand-text-primary flex items-center">
          <AwardIcon className="h-6 w-6 mr-2 text-amber-500" />
          Доска Почёта (Передовики)
        </h2>
        <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Текущий месяц</span>
      </div>

      <div className="flex-grow space-y-3 overflow-y-auto custom-scrollbar-thin pr-1">
        {entries.length === 0 ? (
          <p className="text-center text-brand-text-muted my-auto italic">Герои труда ещё определяются...</p>
        ) : (
          entries.map((user, idx) => (
            <div key={user.userId} className="flex items-center gap-3 p-2 bg-brand-surface rounded-lg border border-brand-border hover:shadow-sm transition-all group">
              <div className="flex-shrink-0 relative">
                <div className={`w-10 h-10 rounded-full ${getAssigneeColor(user.userId)} flex items-center justify-center text-white font-bold text-lg border-2 border-brand-border group-hover:border-amber-400 transition-colors`}>
                  {user.avatarLetter}
                </div>
                <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                   #{idx + 1}
                </div>
              </div>
              <div className="flex-grow min-w-0">
                <p className="text-sm font-bold text-brand-text-primary truncate">{user.userName}</p>
                <div className="flex gap-3 text-[10px] text-brand-text-muted">
                    <span className="flex items-center"><SparklesIcon className="h-3 w-3 mr-0.5 text-sky-400"/> КТУ: {user.ktu}</span>
                    <span className="flex items-center"><ListBulletIcon className="h-3 w-3 mr-0.5 text-emerald-400"/> Задач: {user.tasksCompleted}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 pt-2 border-t border-brand-border text-center">
          <p className="text-[10px] text-brand-text-muted italic">"Труд в нашем обществе — дело чести, дело славы, дело доблести и геройства"</p>
      </div>
    </Card>
  );
};

export default BoardOfHonorWidget;
