
// types/user.ts

import { UserAchievement, UserDisciplinaryAction, DevelopmentPlanItem, TrainingApplication, PerformanceReview, SalaryHistoryEntry, GroupMembershipEntry, AttendanceEntry } from './common';

export interface KTUComponent {
  label: string;
  value: number;
  type: 'base' | 'bonus' | 'penalty';
  description?: string;
}

export interface KTUDetails {
  period: string; // YYYY-MM
  base: number;
  total: number;
  components: KTUComponent[];
  calculatedAt: string;
}

export interface DailyStats {
  date: string;
  shiftStatus: 'active' | 'closed' | 'not_started';
  checkInTime?: string;
  hoursWorked: number;
  earnedTotal: number;
  earnedBase: number;
  earnedBonus: number;
  currentKTU: number;
  completedTasksCount: number;
}

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
  currentMonthKTU?: KTUDetails; // Snapshot of current calculation
  ktuHistory?: KTUDetails[]; // Historical data
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
