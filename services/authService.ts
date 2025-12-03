import { User } from '../types';
import { MOCK_USERS, CEO_EMAILS } from './mockData/users';
import { API_CONFIG } from './api/config';
import { apiClient } from './apiClient';

export interface LoginCredentials {
  email: string;
  password?: string;
  name?: string;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

let MOCK_LOGGED_IN_USER: User | null = null;

export const authService = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    // 1. REAL API PATH
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.AUTH) {
      try {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
        localStorage.setItem('authToken', response.accessToken);
        localStorage.setItem('authUser', JSON.stringify(response.user));
        MOCK_LOGGED_IN_USER = response.user;
        return response.user;
      } catch (error) {
        console.error("Real API Login failed:", error);
        throw error; // Propagate error to UI
      }
    }

    // 2. MOCK PATH (Legacy)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const loginIdentifier = credentials.email.toLowerCase();
        let user: User | undefined;
        
        // Special check for demo mode
        const isDemoMode = (loginIdentifier === 'demo' || loginIdentifier === 'demo@fungfung.ru') && credentials.password === 'demo';

        if (isDemoMode) {
             user = MOCK_USERS.find(u => u.email === 'demo@fungfung.ru');
        } else if (loginIdentifier.includes('@')) {
          user = MOCK_USERS.find(u => u.email.toLowerCase() === loginIdentifier);
        } else {
          user = MOCK_USERS.find(u => u.email.toLowerCase().startsWith(loginIdentifier + '@'));
        }

        if ((user && credentials.password === 'password123') || (user && isDemoMode)) {
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
          // In mock mode, we don't set a real token, but we could set a dummy one
          localStorage.setItem('authToken', 'mock-jwt-token'); 
          resolve(fullUser);
        } else {
          reject(new Error('Неверный email/логин или пароль.'));
        }
      }, 1000);
    });
  },

  register: async (credentials: LoginCredentials): Promise<User> => {
     // 1. REAL API PATH
     if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.AUTH) {
        try {
          const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
          localStorage.setItem('authToken', response.accessToken);
          localStorage.setItem('authUser', JSON.stringify(response.user));
          MOCK_LOGGED_IN_USER = response.user;
          return response.user;
        } catch (error) {
          console.error("Real API Register failed:", error);
          throw error;
        }
      }

    // 2. MOCK PATH
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
        localStorage.setItem('authToken', 'mock-jwt-token');
        resolve(newUser);
      }, 1000);
    });
  },

  logout: async (): Promise<void> => {
    // 1. REAL API PATH (Optional, usually stateless)
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.AUTH) {
        try {
             await apiClient.post('/auth/logout', {});
        } catch (e) {
            console.warn("Logout on server failed, clearing local state anyway.");
        }
    }

    // 2. LOCAL CLEANUP (Always)
    return new Promise((resolve) => {
      setTimeout(() => {
        MOCK_LOGGED_IN_USER = null;
        localStorage.removeItem('authUser');
        localStorage.removeItem('authToken');
        resolve();
      }, 500);
    });
  },

  getCurrentUser: async (): Promise<User | null> => {
    // 1. REAL API PATH
    // We check for token presence first
    const token = localStorage.getItem('authToken');
    if (API_CONFIG.USE_REAL_API && API_CONFIG.MODULES.AUTH && token && token !== 'mock-jwt-token') {
        try {
            const user = await apiClient.get<User>('/auth/me');
            MOCK_LOGGED_IN_USER = user;
            localStorage.setItem('authUser', JSON.stringify(user)); // Update cache
            return user;
        } catch (e) {
            // If token invalid, clear it
            console.warn("Token invalid, clearing session.");
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            MOCK_LOGGED_IN_USER = null;
            return null;
        }
    }

    // 2. MOCK PATH / CACHED FALLBACK
    return new Promise((resolve) => {
      setTimeout(() => {
         const storedUser = localStorage.getItem('authUser');
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          
          // If we are in pure Mock mode, we try to sync with the in-memory mock DB
          if (!API_CONFIG.USE_REAL_API) {
             const liveUser = MOCK_USERS.find(u => u.id === parsedUser.id);
              if (liveUser) {
                // Re-hydrate with fresh mock data
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
                resolve(MOCK_LOGGED_IN_USER);
                return;
              }
          }
          
          // Fallback to stored user if not found in mock or if simple mode
          MOCK_LOGGED_IN_USER = parsedUser;
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
          // Ensure arrays are merged or overwritten correctly
          attendance: updatedUser.attendance || MOCK_USERS[index].attendance || [],
          achievements: updatedUser.achievements || MOCK_USERS[index].achievements || [],
          developmentPlan: updatedUser.developmentPlan || MOCK_USERS[index].developmentPlan || [],
          trainingApplications: updatedUser.trainingApplications || MOCK_USERS[index].trainingApplications || [],
          performanceReviews: updatedUser.performanceReviews || MOCK_USERS[index].performanceReviews || [],
          salaryHistory: updatedUser.salaryHistory || MOCK_USERS[index].salaryHistory || [],
      };
      if (MOCK_LOGGED_IN_USER?.id === updatedUser.id) {
        MOCK_LOGGED_IN_USER = MOCK_USERS[index];
        localStorage.setItem('authUser', JSON.stringify(MOCK_LOGGED_IN_USER));
      }
    }
  }
};