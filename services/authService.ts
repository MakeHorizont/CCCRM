import { User } from '../types';
import { MOCK_USERS, CEO_EMAILS } from './mockData/users'; // Import MOCK_USERS and CEO_EMAILS

export interface LoginCredentials {
  email: string;
  password?: string;
  name?: string;
}

let MOCK_LOGGED_IN_USER: User | null = null;

export const authService = {
  login: (credentials: LoginCredentials): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const loginIdentifier = credentials.email.toLowerCase();
        let user: User | undefined;

        if (loginIdentifier.includes('@')) {
          user = MOCK_USERS.find(u => u.email.toLowerCase() === loginIdentifier);
        } else {
          user = MOCK_USERS.find(u => u.email.toLowerCase().startsWith(loginIdentifier + '@'));
        }

        if (user && credentials.password === 'password123') {
          const fullUser = {
            ...user,
            role: user.role || (CEO_EMAILS.includes(user.email) ? 'ceo' : 'employee'),
            permissions: user.permissions || (CEO_EMAILS.includes(user.email) ? ['manage_user_hierarchy'] : []),
            attendance: user.attendance || [],
            tripBonusPerDay: user.tripBonusPerDay === undefined ? 0 : user.tripBonusPerDay,
            remoteWorkRate: user.remoteWorkRate === undefined ? 0 : user.remoteWorkRate,
            dailyRate: user.dailyRate === undefined ? 2000 : user.dailyRate,
            achievements: user.achievements || [],
            displayedAchievementId: user.displayedAchievementId || null,
            developmentPlan: user.developmentPlan || [],
            trainingApplications: user.trainingApplications || [],
            performanceReviews: user.performanceReviews || [],
            salaryHistory: user.salaryHistory || [],
          };
          MOCK_LOGGED_IN_USER = fullUser;
          localStorage.setItem('authUser', JSON.stringify(fullUser));
          resolve(fullUser);
        } else {
          reject(new Error('Неверный email/логин или пароль.'));
        }
      }, 1000);
    });
  },

  register: (credentials: LoginCredentials): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (MOCK_USERS.some(u => u.email === credentials.email)) {
          reject(new Error('Пользователь с таким email уже существует.'));
          return;
        }
        const isCeo = CEO_EMAILS.includes(credentials.email);
        const newUser: User = {
          id: String(MOCK_USERS.length + 1 + Date.now().toString().slice(-3)),
          email: credentials.email,
          name: credentials.name || credentials.email.split('@')[0],
          role: isCeo ? 'ceo' : 'employee',
          managerId: isCeo ? null : undefined,
          permissions: isCeo ? ['manage_user_hierarchy'] : [],
          status: 'active',
          functionalRoles: [],
          employmentStartDate: new Date().toISOString().split('T')[0],
          dailyRate: 2000,
          salaryVisibility: 'hidden',
          attendance: [],
          tripBonusPerDay: 0,
          remoteWorkRate: 0,
          achievements: [],
          displayedAchievementId: null,
          disciplinaryActions: [],
          groupMembershipHistory: [],
          absences: { excused: 0, unexcused: 0 },
          developmentPlan: [],
          trainingApplications: [],
          performanceReviews: [],
          salaryHistory: [],
        };
        MOCK_USERS.push(newUser); // Modifies the imported MOCK_USERS array
        MOCK_LOGGED_IN_USER = newUser;
        localStorage.setItem('authUser', JSON.stringify(newUser));
        resolve(newUser);
      }, 1000);
    });
  },

  logout: (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        MOCK_LOGGED_IN_USER = null;
        localStorage.removeItem('authUser');
        resolve();
      }, 500);
    });
  },

  getCurrentUser: (): Promise<User | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
         const storedUser = localStorage.getItem('authUser');
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          const liveUser = MOCK_USERS.find(u => u.id === parsedUser.id);
          if (liveUser) {
            MOCK_LOGGED_IN_USER = {
                ...liveUser,
                attendance: liveUser.attendance || [],
                tripBonusPerDay: liveUser.tripBonusPerDay === undefined ? 0 : liveUser.tripBonusPerDay,
                remoteWorkRate: liveUser.remoteWorkRate === undefined ? 0 : liveUser.remoteWorkRate,
                dailyRate: liveUser.dailyRate === undefined ? 2000 : liveUser.dailyRate,
                achievements: liveUser.achievements || [],
                displayedAchievementId: liveUser.displayedAchievementId || null,
                developmentPlan: liveUser.developmentPlan || [],
                trainingApplications: liveUser.trainingApplications || [],
                performanceReviews: liveUser.performanceReviews || [],
                salaryHistory: liveUser.salaryHistory || [],
            };
          } else {
             MOCK_LOGGED_IN_USER = {
                ...parsedUser,
                attendance: parsedUser.attendance || [],
                tripBonusPerDay: parsedUser.tripBonusPerDay === undefined ? 0 : parsedUser.tripBonusPerDay,
                remoteWorkRate: parsedUser.remoteWorkRate === undefined ? 0 : parsedUser.remoteWorkRate,
                dailyRate: parsedUser.dailyRate === undefined ? 2000 : parsedUser.dailyRate,
                achievements: parsedUser.achievements || [],
                displayedAchievementId: parsedUser.displayedAchievementId || null,
                developmentPlan: parsedUser.developmentPlan || [],
                trainingApplications: parsedUser.trainingApplications || [],
                performanceReviews: parsedUser.performanceReviews || [],
                salaryHistory: parsedUser.salaryHistory || [],
            };
          }
          resolve(MOCK_LOGGED_IN_USER);
        } else {
          resolve(null);
        }
      }, 200);
    });
  },

  getMockUsers: (): User[] => MOCK_USERS.map(u => ({ // Returns a copy of the imported array
      ...u,
      tripBonusPerDay: u.tripBonusPerDay === undefined ? 0 : u.tripBonusPerDay,
      remoteWorkRate: u.remoteWorkRate === undefined ? 0 : u.remoteWorkRate,
      attendance: u.attendance || [],
      dailyRate: u.dailyRate === undefined ? 2000 : u.dailyRate,
      achievements: u.achievements || [],
      displayedAchievementId: u.displayedAchievementId || null,
      developmentPlan: u.developmentPlan || [],
      trainingApplications: u.trainingApplications || [],
      performanceReviews: u.performanceReviews || [],
      salaryHistory: u.salaryHistory || [],
  })),
  updateMockUser: (updatedUser: User): void => { // Operates on the imported MOCK_USERS
    const index = MOCK_USERS.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      MOCK_USERS[index] = {
          ...MOCK_USERS[index],
          ...updatedUser,
          attendance: updatedUser.attendance || MOCK_USERS[index].attendance || [],
          tripBonusPerDay: updatedUser.tripBonusPerDay === undefined ? (MOCK_USERS[index].tripBonusPerDay === undefined ? 0 : MOCK_USERS[index].tripBonusPerDay) : updatedUser.tripBonusPerDay,
          remoteWorkRate: updatedUser.remoteWorkRate === undefined ? (MOCK_USERS[index].remoteWorkRate === undefined ? 0 : MOCK_USERS[index].remoteWorkRate) : updatedUser.remoteWorkRate,
          dailyRate: updatedUser.dailyRate === undefined ? (MOCK_USERS[index].dailyRate === undefined ? 2000 : MOCK_USERS[index].dailyRate) : updatedUser.dailyRate,
          achievements: updatedUser.achievements || MOCK_USERS[index].achievements || [],
          developmentPlan: updatedUser.developmentPlan || MOCK_USERS[index].developmentPlan || [],
          trainingApplications: updatedUser.trainingApplications || MOCK_USERS[index].trainingApplications || [],
          performanceReviews: updatedUser.performanceReviews || MOCK_USERS[index].performanceReviews || [],
          salaryHistory: updatedUser.salaryHistory || MOCK_USERS[index].salaryHistory || [],
          displayedAchievementId: updatedUser.displayedAchievementId === undefined ? (MOCK_USERS[index].displayedAchievementId || null) : updatedUser.displayedAchievementId,
      };
      if (MOCK_LOGGED_IN_USER?.id === updatedUser.id) {
        MOCK_LOGGED_IN_USER = MOCK_USERS[index];
        localStorage.setItem('authUser', JSON.stringify(MOCK_LOGGED_IN_USER));
      }
    }
  }
};