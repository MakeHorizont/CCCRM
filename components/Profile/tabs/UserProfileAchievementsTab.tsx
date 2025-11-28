import React, { useState, ChangeEvent } from 'react';
import { User, UserAchievement } from '../../../types';
import Button from '../../UI/Button';
import Input from '../../UI/Input';
import { AwardIcon, GiftIcon, TrashIcon, PlusIcon } from '../../UI/Icons';
import Tooltip from '../../UI/Tooltip';
import { generateId } from '../../../utils/idGenerators';

interface UserProfileAchievementsTabProps {
  profileData: Partial<User>;
  setProfileData: React.Dispatch<React.SetStateAction<Partial<User>>>;
  user: User;
  allUsers: User[]; 
  canAdminEdit: boolean;
  isSelfView: boolean;
}

const UserProfileAchievementsTab: React.FC<UserProfileAchievementsTabProps> = ({
  profileData,
  setProfileData,
  user,
  allUsers,
  canAdminEdit,
  isSelfView,
}) => {
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Partial<UserAchievement>>({
      name: '', description: '', icon: '🏆', impact: 'medium', dateAwarded: new Date().toISOString().split('T')[0], awardedBy: 'ceo'
  });

  const handleSetBadge = (achievementId: string) => {
    setProfileData(prev => ({
        ...prev,
        displayedAchievementId: prev?.displayedAchievementId === achievementId ? null : achievementId
    }));
  };

  const handleAddNewAchievement = () => {
    if (!newAchievement.name || !newAchievement.description) {
        alert("Название и описание достижения обязательны.");
        return;
    }
    const finalAchievement: UserAchievement = {
        id: `ach-${Date.now()}`,
        ...newAchievement,
        name: newAchievement.name!,
        description: newAchievement.description!,
        icon: newAchievement.icon || '🏆',
        impact: newAchievement.impact || 'medium',
        dateAwarded: newAchievement.dateAwarded || new Date().toISOString().split('T')[0],
        awardedBy: newAchievement.awardedBy || (canAdminEdit ? 'ceo' : 'system'),
        awardedById: (newAchievement.awardedBy === 'ceo' && canAdminEdit) ? user.id : undefined,
    };
    setProfileData(prev => ({
        ...prev,
        achievements: [...(prev?.achievements || []), finalAchievement]
    }));
    setIsAddingAchievement(false);
    setNewAchievement({name: '', description: '', icon: '🏆', impact: 'medium', dateAwarded: new Date().toISOString().split('T')[0], awardedBy: 'ceo'});
  };
  
  const handleRemoveAchievement = (idToRemove: string) => {
      setProfileData(prev => ({
          ...prev,
          achievements: (prev?.achievements || []).filter(ach => ach.id !== idToRemove)
      }));
  };


  return (
    <div className="space-y-4">
      <h4 className="text-md font-semibold text-brand-text-primary flex items-center">
        <AwardIcon className="h-5 w-5 mr-2 text-amber-400"/>Достижения и Премии
      </h4>
      {(profileData.achievements || []).length === 0 && !isAddingAchievement && (
        <p className="text-xs text-brand-text-muted italic">У пользователя пока нет достижений.</p>
      )}
      <div className="space-y-3">
        {(profileData.achievements || []).map(ach => (
          <div key={ach.id} className={`p-3 rounded-md border ${ach.id === profileData.displayedAchievementId ? 'border-sky-500 bg-sky-500/10 shadow-md' : 'border-brand-border bg-brand-surface'}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <span className="text-xl mr-2" role="img" aria-label={ach.name}>{ach.icon || '🏆'}</span>
                <div>
                  <h5 className="font-semibold text-brand-text-primary">{ach.name}</h5>
                  <p className="text-xs text-brand-text-secondary">{ach.description}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Tooltip text={ach.id === profileData.displayedAchievementId ? "Снять значок профиля" : "Сделать значком профиля"}>
                    <Button 
                        size="sm" 
                        variant={ach.id === profileData.displayedAchievementId ? "primary" : "secondary"}
                        onClick={() => handleSetBadge(ach.id)}
                    >
                        {ach.id === profileData.displayedAchievementId ? "Текущий значок" : "На значок"}
                    </Button>
                </Tooltip>
                 {canAdminEdit && (
                     <Tooltip text="Удалить достижение">
                        <Button size="sm" variant="danger" onClick={() => handleRemoveAchievement(ach.id)} className="p-1.5">
                            <TrashIcon className="h-4 w-4"/>
                        </Button>
                    </Tooltip>
                 )}
              </div>
            </div>
            <div className="text-xs text-brand-text-muted mt-1.5 pt-1.5 border-t border-brand-border/50">
              <p>Получено: {new Date(ach.dateAwarded).toLocaleDateString('ru-RU')} (Кем: {ach.awardedBy === 'ceo' && ach.awardedById ? (allUsers.find(u=>u.id === ach.awardedById)?.name || 'CEO') : ach.awardedBy})</p>
              {ach.bonusAmount && ach.bonusType && (
                <p className="flex items-center"><GiftIcon className="h-3.5 w-3.5 mr-1 text-emerald-400"/>
                  Премия: {ach.bonusAmount.toLocaleString('ru-RU')} {ach.bonusCurrency || 'RUB'} ({
                  ach.bonusType === 'one-time' ? 'разовая' :
                  ach.bonusType === 'monthly' ? 'ежемесячная' :
                  ach.bonusType === 'annual' ? 'ежегодная' : 'не указан'})
                  {ach.bonusRecurringUntil && ` до ${new Date(ach.bonusRecurringUntil).toLocaleDateString('ru-RU')}`}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {canAdminEdit && (
          isAddingAchievement ? (
            <div className="mt-4 p-3 border border-brand-border rounded-md bg-brand-surface space-y-3">
                <Input id="new-ach-name" label="Название достижения" value={newAchievement.name || ''} onChange={e => setNewAchievement(p => ({...p, name: e.target.value}))} />
                <textarea id="new-ach-desc" placeholder="Описание" value={newAchievement.description || ''} onChange={e => setNewAchievement(p => ({...p, description: e.target.value}))} className="w-full p-2 bg-brand-card border border-brand-border rounded-md text-xs" rows={2}/>
                <div className="grid grid-cols-2 gap-2">
                    <Input id="new-ach-icon" label="Иконка (emoji)" value={newAchievement.icon || ''} onChange={e => setNewAchievement(p => ({...p, icon: e.target.value}))} />
                    <Input id="new-ach-date" label="Дата присуждения" type="date" value={newAchievement.dateAwarded || ''} onChange={e => setNewAchievement(p => ({...p, dateAwarded: e.target.value}))} />
                </div>
                 <select id="new-ach-impact" value={newAchievement.impact || 'medium'} onChange={e => setNewAchievement(p => ({...p, impact: e.target.value as UserAchievement['impact']}))} className="w-full p-2 bg-brand-card border border-brand-border rounded-md text-xs">
                    <option value="low">Низкое влияние</option>
                    <option value="medium">Среднее влияние</option>
                    <option value="high">Высокое влияние</option>
                </select>
                {/* Basic bonus fields */}
                <div className="grid grid-cols-3 gap-2">
                    <select id="new-ach-bonus-type" value={newAchievement.bonusType || ''} onChange={e => setNewAchievement(p => ({...p, bonusType: e.target.value as UserAchievement['bonusType'] || null}))} className="w-full p-2 bg-brand-card border border-brand-border rounded-md text-xs">
                        <option value="">Без бонуса</option>
                        <option value="one-time">Разовый</option>
                        <option value="monthly">Ежемесячный</option>
                        <option value="annual">Ежегодный</option>
                    </select>
                    <Input id="new-ach-bonus-amount" type="number" placeholder="Сумма" value={String(newAchievement.bonusAmount || '')} onChange={e => setNewAchievement(p => ({...p, bonusAmount: parseFloat(e.target.value) || undefined}))} disabled={!newAchievement.bonusType} />
                     <select id="new-ach-bonus-currency" value={newAchievement.bonusCurrency || 'RUB'} onChange={e => setNewAchievement(p => ({...p, bonusCurrency: e.target.value as UserAchievement['bonusCurrency']}))} className="w-full p-2 bg-brand-card border border-brand-border rounded-md text-xs" disabled={!newAchievement.bonusType}>
                        <option value="RUB">RUB</option><option value="USD">USD</option><option value="EUR">EUR</option>
                    </select>
                </div>
                <div className="flex justify-end space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => setIsAddingAchievement(false)}>Отмена</Button>
                    <Button size="sm" onClick={handleAddNewAchievement}>Добавить</Button>
                </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => setIsAddingAchievement(true)} leftIcon={<PlusIcon className="h-4 w-4"/>} className="mt-3">
                Добавить достижение/премию
            </Button>
          )
      )}
    </div>
  );
};

export default UserProfileAchievementsTab;
