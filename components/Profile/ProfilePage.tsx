
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, KanbanTask } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';
import { BriefcaseIcon, CalendarDaysIcon, SparklesIcon, UserGroupIcon, AwardIcon, ListBulletIcon, CheckCircleIcon, ArrowTrendingUpIcon, BanknotesIcon } from '../UI/Icons';
import UserProfileMainTab from './tabs/UserProfileMainTab';
import UserProfileRolesSalaryTab from './tabs/UserProfileRolesSalaryTab';
import { UserProfileAttendanceTab } from './tabs/UserProfileAttendanceTab';
import UserProfileAchievementsTab from './tabs/UserProfileAchievementsTab';
import UserProfileTasksTab from './tabs/UserProfileTasksTab';
import UserProfileDevelopmentTab from './tabs/UserProfileDevelopmentTab';
import UserProfileCareerTab from './tabs/UserProfileCareerTab'; 
import UserProfilePayslipTab from './tabs/UserProfilePayslipTab';
import { USER_STATUS_OPTIONS, USER_STATUS_COLOR_MAP } from '../../constants';

export type ProfileModalTabId = 'main' | 'roles_salary' | 'attendance' | 'development' | 'achievements' | 'tasks' | 'career' | 'payslip';

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Partial<User>>({});
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userTasks, setUserTasks] = useState<KanbanTask[]>([]);
  const [availableFunctionalRoles, setAvailableFunctionalRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileModalTabId>('main');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const targetUserId = userId || currentUser?.id;
  const isSelfView = !userId || currentUser?.id === userId;
  const canAdminEdit = currentUser?.role === 'ceo';

  const initializeProfileState = useCallback((userToLoad: User) => {
    setProfileData({
      id: userToLoad.id,
      name: userToLoad.name,
      email: userToLoad.email,
      managerId: userToLoad.managerId,
      status: userToLoad.status || 'active',
      functionalRoles: userToLoad.functionalRoles ? [...userToLoad.functionalRoles] : [],
      dailyRate: userToLoad.dailyRate,
      salaryVisibility: userToLoad.salaryVisibility || 'hidden',
      achievements: userToLoad.achievements ? userToLoad.achievements.map(a => ({ ...a })) : [],
      disciplinaryActions: userToLoad.disciplinaryActions ? userToLoad.disciplinaryActions.map(d => ({ ...d })) : [],
      groupMembershipHistory: userToLoad.groupMembershipHistory ? userToLoad.groupMembershipHistory.map(g => ({ ...g })) : [],
      attendance: userToLoad.attendance ? userToLoad.attendance.map(att => ({ ...att })) : [],
      tripBonusPerDay: userToLoad.tripBonusPerDay === undefined ? 0 : userToLoad.tripBonusPerDay,
      remoteWorkRate: userToLoad.remoteWorkRate === undefined ? 0 : userToLoad.remoteWorkRate,
      displayedAchievementId: userToLoad.displayedAchievementId || null,
      employmentStartDate: userToLoad.employmentStartDate,
      reputationScore: userToLoad.reputationScore,
      developmentPlan: userToLoad.developmentPlan ? userToLoad.developmentPlan.map(dp => ({ ...dp })) : [],
      trainingApplications: userToLoad.trainingApplications ? userToLoad.trainingApplications.map(ta => ({ ...ta })) : [],
      performanceReviews: userToLoad.performanceReviews ? userToLoad.performanceReviews.map(pr => ({ ...pr })) : [],
      salaryHistory: userToLoad.salaryHistory ? userToLoad.salaryHistory.map(sh => ({ ...sh })) : [],
    });
    setActiveTab('main');
  }, []);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUserId) {
        setError("Пользователь не найден.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const [usersData, rolesData, tasksData] = await Promise.all([
          apiService.getUsersWithHierarchyDetails(),
          apiService.getAvailableFunctionalRoles(),
          apiService.getKanbanTasks({ assigneeId: targetUserId, viewMode: 'all' })
        ]);
        
        const userToView = usersData.find(u => u.id === targetUserId);

        if (!userToView) {
          setError("Пользователь не найден.");
          setIsLoading(false);
          return;
        }
        
        setTargetUser(userToView);
        setAllUsers(usersData);
        setAvailableFunctionalRoles(rolesData);
        setUserTasks(tasksData);
        initializeProfileState(userToView);

      } catch (err) {
        setError("Ошибка загрузки данных профиля.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [targetUserId, initializeProfileState]);
  
  const handleProfileDataChange = useCallback((newProfileData: Partial<User>) => {
    setProfileData(prev => ({...prev, ...newProfileData}));
  },[]);


  const handleSubmit = async () => {
    if (!targetUser || !profileData.id) return;
    setError(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await apiService.updateUserProfile(targetUser.id, profileData as User);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      const updatedUser = (await apiService.getUsersWithHierarchyDetails()).find(u => u.id === targetUser.id);
      if (updatedUser) {
        setTargetUser(updatedUser);
        initializeProfileState(updatedUser);
      }
    } catch (err) {
      setError((err as Error).message || "Ошибка сохранения профиля.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const displayedBadge = useMemo(() => {
      if (!profileData.displayedAchievementId || !profileData.achievements) return null;
      return profileData.achievements.find(ach => ach.id === profileData.displayedAchievementId);
  }, [profileData.displayedAchievementId, profileData.achievements]);

  if (isLoading) return <div className="flex justify-center items-center h-full p-8"><LoadingSpinner /></div>;
  if (error) return <div className="text-red-500 text-center p-8">{error}</div>;
  if (!targetUser || !currentUser) return <div className="text-center p-8">Пользователь не найден.</div>;

  const tabConfig: {id: ProfileModalTabId, label: string, icon: React.FC<any>}[] = [
    {id: 'main', label: 'Общее', icon: BriefcaseIcon},
    {id: 'roles_salary', label: 'Роли и Оплата', icon: UserGroupIcon},
    {id: 'career', label: 'Карьера', icon: ArrowTrendingUpIcon},
    {id: 'attendance', label: 'Посещаемость', icon: CalendarDaysIcon},
    {id: 'payslip', label: 'Финансы', icon: BanknotesIcon},
    {id: 'development', label: 'Развитие', icon: SparklesIcon},
    {id: 'achievements', label: 'Достижения', icon: AwardIcon},
    {id: 'tasks', label: 'Задачи', icon: ListBulletIcon},
  ];


  return (
    <div className="space-y-6">
      <div className="bg-brand-card p-4 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start">
            <div className="flex items-center space-x-4">
                 <div className="w-16 h-16 rounded-full bg-brand-secondary flex items-center justify-center text-3xl font-semibold border-2 border-brand-border">
                    {targetUser.name ? targetUser.name.substring(0,1).toUpperCase() : targetUser.email.substring(0,1).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-brand-text-primary">{targetUser.name || targetUser.email}</h1>
                    <p className="text-sm text-brand-text-muted">{targetUser.email}</p>
                     <p className="text-sm text-brand-text-muted">Статус: <span className={`px-1.5 py-0.5 rounded-full text-xs ${USER_STATUS_COLOR_MAP[targetUser.status || 'active']}`}>{USER_STATUS_OPTIONS.find(o=>o.value === (targetUser.status || 'active'))?.label || targetUser.status}</span></p>
                </div>
            </div>
             {displayedBadge && (
                <div className="sm:col-span-1 p-2 bg-brand-surface rounded-md border border-sky-600/30 text-center mt-2 sm:mt-0 flex flex-col items-center justify-center">
                    <span className="text-3xl block mb-0.5" role="img" aria-label={`Значок: ${displayedBadge.name}`}>{displayedBadge.icon || '🏆'}</span>
                    <p className="text-xs font-semibold text-sky-400 truncate" title={displayedBadge.name}>{displayedBadge.name}</p>
                </div>
            )}
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                {saveSuccess && <span className="text-emerald-500 flex items-center text-sm transition-opacity duration-300"><CheckCircleIcon className="h-5 w-5 mr-1"/>Сохранено</span>}
                 <Button onClick={handleSubmit} isLoading={isSaving} variant="primary">Сохранить изменения</Button>
            </div>
        </div>
      </div>
      
       <div className="border-b border-brand-border">
            <nav className="-mb-px flex space-x-1 overflow-x-auto custom-scrollbar-thin pb-px" aria-label="Profile Tabs">
                {tabConfig.map(tab => (
                     <Button
                        key={tab.id}
                        type="button"
                        variant="ghost"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-2 py-2 sm:px-3 text-xs sm:text-sm rounded-t-md border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-sky-500 text-sky-400 bg-brand-card' : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-border'}`}
                        leftIcon={<tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-sky-400' : 'text-brand-text-muted'}`}/>}
                    >
                        {tab.label}
                    </Button>
                ))}
            </nav>
        </div>
      
      <div className="p-1">
        {activeTab === 'main' && (
            <UserProfileMainTab
                profileData={profileData}
                setProfileData={handleProfileDataChange}
                user={targetUser}
                allUsers={allUsers}
                canAdminEdit={canAdminEdit}
                allTasks={userTasks}
            />
        )}
        {activeTab === 'roles_salary' && (
             <UserProfileRolesSalaryTab
                profileData={profileData}
                setProfileData={handleProfileDataChange}
                user={targetUser}
                canAdminEdit={canAdminEdit}
                isSelfView={isSelfView}
                allSystemRoles={availableFunctionalRoles}
            />
        )}
        {activeTab === 'career' && (
            <UserProfileCareerTab
                profileData={profileData}
                setProfileData={handleProfileDataChange}
                user={targetUser}
                allUsers={allUsers}
                currentUser={currentUser}
                canAdminEdit={canAdminEdit}
                isSelfView={isSelfView}
                userTasks={userTasks}
            />
        )}
        {activeTab === 'attendance' && (
            <UserProfileAttendanceTab
                currentAttendanceData={profileData.attendance || []}
                onAttendanceChange={(newAttendance) => handleProfileDataChange({ attendance: newAttendance })}
                user={targetUser}
                canAdminEdit={canAdminEdit}
            />
        )}
        {activeTab === 'payslip' && (
            <UserProfilePayslipTab
                user={targetUser}
                canAdminEdit={canAdminEdit}
                isSelfView={isSelfView}
            />
        )}
        {activeTab === 'development' && (
            <UserProfileDevelopmentTab
                profileData={profileData}
                setProfileData={handleProfileDataChange}
                user={targetUser}
                isSelfView={isSelfView}
                canAdminEdit={canAdminEdit}
            />
        )}
         {activeTab === 'achievements' && (
            <UserProfileAchievementsTab
                profileData={profileData}
                setProfileData={handleProfileDataChange}
                user={targetUser}
                allUsers={allUsers}
                canAdminEdit={canAdminEdit}
                isSelfView={isSelfView}
            />
        )}
        {activeTab === 'tasks' && (
            <UserProfileTasksTab
                user={targetUser}
                tasks={userTasks}
                isLoading={isLoading}
                error={error}
            />
        )}
      </div>

       <style>{`
        .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>
  );
};

export default ProfilePage;
