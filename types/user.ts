// types/user.ts

import { UserAchievement, UserDisciplinaryAction, DevelopmentPlanItem, TrainingApplication, PerformanceReview, SalaryHistoryEntry, GroupMembershipEntry, AttendanceEntry } from './common';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'ceo' | 'manager' | 'employee';
  managerId?: string | null;
  permissions?: string[];
  updatedAt?: string;
  status?: UserStatus;
  functionalRoles?: string[];
  employmentStartDate?: string;
  dailyRate?: number;
  salaryVisibility?: 'visible' | 'hidden';
  achievements?: UserAchievement[];
  disciplinaryActions?: UserDisciplinaryAction[];
  absences?: { excused: number; unexcused: number; };
  attendance?: AttendanceEntry[];
  reputationScore?: number;
  groupMembershipHistory?: GroupMembershipEntry[];
  tripBonusPerDay?: number;
  remoteWorkRate?: number;
  displayedAchievementId?: string | null;
  developmentPlan?: DevelopmentPlanItem[];
  trainingApplications?: TrainingApplication[];
  performanceReviews?: PerformanceReview[];
  salaryHistory?: SalaryHistoryEntry[];
}

export type UserStatus = 'active' | 'trip' | 'vacation' | 'fired';