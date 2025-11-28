// types/common.ts
import { CompanyRequisites, Requisites } from './contact';
import { OrderItem } from './order';
import { KanbanTask } from './kanban';
import { User } from './user';


export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  timestamp: string;
}

export interface AttendanceEntry {
  date: string;
  type: 'work' | 'late' | 'excused_absence' | 'unexcused_absence' | 'trip' | 'remote';
  notes?: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export interface UserAchievement {
  id: string;
  name: string;
  icon?: string;
  description: string;
  dateAwarded: string;
  awardedBy: 'ceo' | 'vote' | 'system';
  awardedById?: string;
  votes?: { userId: string; userName: string; timestamp: string }[];
  bonusType?: 'one-time' | 'monthly' | 'annual' | null;
  bonusAmount?: number;
  bonusCurrency?: 'RUB' | 'USD' | 'EUR';
  bonusRecurringUntil?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface DevelopmentPlanItem {
  id: string;
  goal: string;
  status: 'not_started' | 'in_progress' | 'completed';
  targetDate?: string;
  notes?: string;
}

export interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  type: 'internal' | 'external';
  url?: string;
  tags?: string[];
  durationHours?: number;
}

export interface TrainingApplication {
  id: string;
  courseId: string;
  courseTitle: string;
  userId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: { userId: string, userName: string };
  reviewedAt?: string;
}

export interface PerformanceReview {
  id: string;
  reviewDate: string;
  reviewerId: string;
  reviewerName: string;
  overallRating: 'needs_improvement' | 'meets_expectations' | 'exceeds_expectations' | 'outstanding';
  strengths: string;
  areasForImprovement: string;
  goalsForNextPeriod: string;
  employeeFeedback?: string | null;
}

export interface SalaryHistoryEntry {
  id: string;
  changeDate: string;
  newDailyRate: number;
  reason: string;
  changedBy: {
    userId: string;
    userName: string;
  };
}

export interface UserDisciplinaryAction {
  id: string;
  date: string;
  type: 'remark' | 'warning' | 'reprimand' | 'serious_violation';
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GroupMembershipEntry {
  roleName: string;
  joinDate: string;
  leaveDate?: string;
}

export type DocumentType = 'invoice' | 'waybill';

export interface Document {
    id: string;
    type: DocumentType;
    number: string;
    date: string;
    orderId: string;
    ourRequisites: CompanyRequisites;
    customerRequisites: Requisites;
    items: OrderItem[];
    totalAmount: number;
    createdAt: string;
}

export interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  lowStockThreshold: number;
  unit: string;
  type: 'warehouse' | 'household';
}

export interface ProductionMetrics {
  totalPlannedItems: number;
  totalProducedItems: number;
  efficiency: number; // percentage
  activeOrdersCount: number;
  delayedOrdersCount: number;
}

export interface MaterialRequirement {
  householdItemId: string;
  householdItemName: string;
  unit: string;
  totalRequired: number;
  inStock: number;
  deficit: number;
  relatedPOs: { id: string; name: string, qty: number }[];
}

export interface PersonalDashboardSummary {
  tasks: {
    activeCount: number;
    overdueCount: number;
    topTasks: KanbanTask[];
  };
  development: {
    inProgressGoals: DevelopmentPlanItem[];
  };
  achievements: {
    recentAchievements: UserAchievement[];
    displayedBadge: UserAchievement | null;
  };
  user: User;
}

export interface FundTransaction {
    id: string;
    date: string;
    type: 'contribution' | 'expense';
    amount: number;
    description: string;
    relatedUserId?: string;
    relatedUserName?: string;
    relatedInitiativeId?: string;
    relatedPeriod?: string;
}

export interface CollectiveFund {
    balance: number;
    contributionPercentage: number;
    history: FundTransaction[];
}

export interface Bonus {
  id: string;
  userId: string;
  type: 'suggestion' | 'brigade' | 'achievement';
  amount: number;
  date: string;
  description: string;
  relatedEntityId: string;
  createdAt: string;
}

export interface OrderHistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  action: 'created' | 'status_change' | 'priority_seizure';
  details: string;
}

export type RotationArea = 'Производство' | 'Коммуникации' | 'Стратегия' | 'Администрирование';

export interface RotationScheduleEntry {
  id: string;
  userId: string | null;
  area: RotationArea;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}