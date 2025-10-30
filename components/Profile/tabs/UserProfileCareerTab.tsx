import React, { useMemo, useState } from 'react';
import { User, PerformanceReview, SalaryHistoryEntry, KanbanTask } from '../../../types';
import { ArrowTrendingUpIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, BanknotesIcon } from '../../UI/Icons';
import Card from '../../UI/Card';
import Button from '../../UI/Button';
import MarkdownDisplay from '../../UI/MarkdownDisplay';
import AddReviewModal from './AddReviewModal';
import AddSalaryChangeModal from './AddSalaryChangeModal';
import { PERFORMANCE_RATING_STYLES } from '../../../constants';

interface UserProfileCareerTabProps {
  profileData: Partial<User>;
  setProfileData: (data: Partial<User>) => void;
  user: User;
  allUsers: User[]; // For the reviewer dropdown in the modal
  currentUser: User; // The logged in user
  canAdminEdit: boolean;
  isSelfView: boolean;
  userTasks: KanbanTask[]; // For AI review context
}

const UserProfileCareerTab: React.FC<UserProfileCareerTabProps> = ({
  profileData,
  setProfileData,
  user,
  allUsers,
  currentUser,
  canAdminEdit,
  isSelfView,
  userTasks,
}) => {
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false);
  const [isAddSalaryModalOpen, setIsAddSalaryModalOpen] = useState(false);

  const sortedCareerHistory = useMemo(() => {
    return (profileData.groupMembershipHistory || [])
        .sort((a, b) => new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime());
  }, [profileData.groupMembershipHistory]);

  const sortedReviews = useMemo(() => {
    return (profileData.performanceReviews || [])
      .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
  }, [profileData.performanceReviews]);

  const sortedSalaryHistory = useMemo(() => {
    return (profileData.salaryHistory || [])
      .sort((a,b) => new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime());
  }, [profileData.salaryHistory]);


  const handleSaveNewReview = (newReview: PerformanceReview) => {
    setProfileData({
        ...profileData,
        performanceReviews: [...(profileData.performanceReviews || []), newReview]
    });
    setIsAddReviewModalOpen(false);
  };
  
  const handleSaveNewSalaryEntry = (newEntry: SalaryHistoryEntry) => {
    setProfileData({
        ...profileData,
        salaryHistory: [...(profileData.salaryHistory || []), newEntry],
        dailyRate: newEntry.newDailyRate // Also update the current daily rate
    });
    setIsAddSalaryModalOpen(false);
  };

  const managers = useMemo(() => {
    return allUsers.filter(u => u.role === 'manager' || u.role === 'ceo');
  }, [allUsers]);

  return (
    <div className="space-y-6">
      {/* Career Path Section */}
      <Card>
        <h3 className="text-md font-semibold text-brand-text-primary mb-3 flex items-center">
          <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-emerald-400"/>
          Карьерный Путь
        </h3>
        {sortedCareerHistory.length > 0 ? (
          <div className="relative pl-4">
            {/* Vertical timeline bar */}
            <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-brand-border"></div>
            
            <div className="space-y-6">
              {sortedCareerHistory.map((entry, index) => (
                <div key={index} className="relative flex items-start">
                  <div className="absolute left-6 top-1.5 -ml-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-brand-surface"></div>
                  <div className="ml-8">
                    <h4 className="font-semibold text-brand-text-primary">{entry.roleName}</h4>
                    <p className="text-xs text-brand-text-muted">
                      {new Date(entry.joinDate).toLocaleDateString('ru-RU')} - {entry.leaveDate ? new Date(entry.leaveDate).toLocaleDateString('ru-RU') : 'Настоящее время'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-brand-text-muted italic">История изменения должностей/ролей не заполнена.</p>
        )}
      </Card>
      
      {/* Performance Reviews Section */}
      <Card>
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold text-brand-text-primary">
            Аттестации и Ревью
            </h3>
            {canAdminEdit && (
                <Button size="sm" onClick={() => setIsAddReviewModalOpen(true)} leftIcon={<PlusIcon className="h-4 w-4"/>}>
                    Добавить ревью
                </Button>
            )}
        </div>
        <div className="space-y-2">
            {sortedReviews.length > 0 ? sortedReviews.map(review => {
                const ratingStyle = PERFORMANCE_RATING_STYLES[review.overallRating];
                const isExpanded = expandedReviewId === review.id;
                return (
                    <div key={review.id} className="bg-brand-surface rounded-md border border-brand-border">
                        <button onClick={() => setExpandedReviewId(isExpanded ? null : review.id)} className="w-full flex justify-between items-center p-2 text-left">
                           <div>
                                <p className="font-semibold text-brand-text-primary">Ревью от {new Date(review.reviewDate).toLocaleDateString('ru-RU')}</p>
                                <p className="text-xs text-brand-text-muted">Ревьюер: {review.reviewerName}</p>
                           </div>
                           <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${ratingStyle.pill}`}>{ratingStyle.label}</span>
                                {isExpanded ? <ChevronUpIcon className="h-4 w-4"/> : <ChevronDownIcon className="h-4 w-4"/>}
                           </div>
                        </button>
                        {isExpanded && (
                            <div className="p-3 border-t border-brand-border space-y-3 text-sm">
                                <div>
                                    <h5 className="font-semibold text-brand-text-secondary mb-1">Сильные стороны:</h5>
                                    <MarkdownDisplay markdown={review.strengths} />
                                </div>
                                <div>
                                    <h5 className="font-semibold text-brand-text-secondary mb-1">Зоны роста:</h5>
                                    <MarkdownDisplay markdown={review.areasForImprovement} />
                                </div>
                                 <div>
                                    <h5 className="font-semibold text-brand-text-secondary mb-1">Цели на следующий период:</h5>
                                    <MarkdownDisplay markdown={review.goalsForNextPeriod} />
                                </div>
                                {review.employeeFeedback && (
                                     <div>
                                        <h5 className="font-semibold text-brand-text-secondary mb-1">Обратная связь сотрудника:</h5>
                                        <blockquote className="border-l-4 border-brand-border pl-2 italic text-brand-text-muted">
                                            <MarkdownDisplay markdown={review.employeeFeedback} />
                                        </blockquote>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }) : <p className="text-sm text-brand-text-muted italic">Ревью еще не проводились.</p>}
        </div>
      </Card>
      
      {/* Salary History Section */}
      {(canAdminEdit || (isSelfView && profileData.salaryVisibility === 'visible')) && (
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold text-brand-text-primary flex items-center">
                <BanknotesIcon className="h-5 w-5 mr-2 text-green-400"/>
                История изменения оклада
            </h3>
            {canAdminEdit && (
                <Button size="sm" onClick={() => setIsAddSalaryModalOpen(true)} leftIcon={<PlusIcon className="h-4 w-4"/>}>
                    Добавить запись
                </Button>
            )}
          </div>
          <div className="space-y-2">
              {sortedSalaryHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-brand-text-muted uppercase">
                              <tr>
                                  <th className="py-2 px-2">Дата</th>
                                  <th className="py-2 px-2 text-right">Ставка в день</th>
                                  <th className="py-2 px-2">Причина</th>
                                  <th className="py-2 px-2">Кем изменено</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-border">
                              {sortedSalaryHistory.map(entry => (
                                  <tr key={entry.id}>
                                      <td className="py-2 px-2 whitespace-nowrap">{new Date(entry.changeDate).toLocaleDateString('ru-RU')}</td>
                                      <td className="py-2 px-2 text-right font-semibold text-brand-text-primary">{entry.newDailyRate.toLocaleString('ru-RU')} ₽</td>
                                      <td className="py-2 px-2">{entry.reason}</td>
                                      <td className="py-2 px-2 text-brand-text-secondary">{entry.changedBy.userName}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : <p className="text-sm text-brand-text-muted italic">История изменения оклада отсутствует.</p>}
          </div>
        </Card>
      )}

      {isAddReviewModalOpen && currentUser &&
        <AddReviewModal 
            isOpen={isAddReviewModalOpen}
            onClose={() => setIsAddReviewModalOpen(false)}
            onSave={handleSaveNewReview}
            isSaving={false} // Since saving is just a state update before main save
            managers={managers}
            currentUserId={currentUser.id}
            reviewedUser={user}
            userTasks={userTasks}
            userAchievements={profileData.achievements || []}
        />
      }
      
      {isAddSalaryModalOpen && currentUser &&
        <AddSalaryChangeModal
            isOpen={isAddSalaryModalOpen}
            onClose={() => setIsAddSalaryModalOpen(false)}
            onSave={handleSaveNewSalaryEntry}
            isSaving={false}
            currentUser={currentUser}
        />
       }
    </div>
  );
};

export default UserProfileCareerTab;