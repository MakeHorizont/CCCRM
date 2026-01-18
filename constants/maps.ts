
// constants/maps.ts
import { ContactPriority, OrderStatus, KanbanTaskStatus, StrategicPlan, ProductionOrderStatus, PurchaseRequestStatus, EquipmentStatus, DiscussionStatus, DocumentType, UserStatus, TaskStage, PerformanceReview, AttendanceEntry, SocialInitiativeStatus, RotationArea } from '../types';
import { LinkIcon, PhoneIcon, CheckCircleIcon, FireIcon, StarIcon, SparklesIcon, HashtagIcon } from '../components/UI/Icons';
import React from 'react';

export const PRIORITY_ICON_MAP: Record<ContactPriority, { icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
  '1': { icon: FireIcon, color: 'text-red-500 dark:text-red-400', label: 'Высокий приоритет'},
  '2': { icon: StarIcon, color: 'text-amber-500 dark:text-amber-400', label: 'Средний приоритет'},
  '3': { icon: SparklesIcon, color: 'text-sky-500 dark:text-sky-400', label: 'Низкий приоритет'},
};

export const PRIORITY_SORT_MAP: Record<ContactPriority | '3', number> = {
  '1': 3,
  '2': 2,
  '3': 1,
};


export const ORDER_STATUS_COLOR_MAP: Record<OrderStatus | 'default', string> = {
  'Новый': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  'Может быть собран': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  'Не может быть собран': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'В обработке': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Собран': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  'Отправлен': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Доставлен': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'Отменен': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Возврат': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  'Частичный возврат': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'default': 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
};

// FIX: Add missing properties to satisfy Record<DocumentType, string> requirement
export const DOCUMENT_TYPE_COLOR_MAP: Record<DocumentType, string> = {
  invoice: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  waybill: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  contract: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  act: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  manual: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  other: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
};

export const DISCUSSION_STATUS_COLOR_MAP: Record<DiscussionStatus | 'default', string> = {
  'open': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'voting': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  'closed': 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
  'archived': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'default': 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
};

export const SOCIAL_INITIATIVE_STATUS_COLOR_MAP: Record<SocialInitiativeStatus | 'default', string> = {
  'proposal': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  'active': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  'funded': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'completed': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'default': 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
};

export const STRATEGY_STATUS_COLOR_MAP: Record<StrategicPlan['status'] | 'default', string> = {
  'Планируется': 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900 dark:text-sky-200 dark:border-sky-700',
  'Активен': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700',
  'Завершен': 'bg-zinc-200 text-zinc-800 border-zinc-400 dark:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-500',
  'На удержании': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
  'default': 'bg-gray-200 text-gray-800 border-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500',
};

export const PRODUCTION_ORDER_STATUS_COLOR_MAP: Record<ProductionOrderStatus | 'default', string> = {
  'Планируется': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  'Ожидает сырья': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Готово к запуску': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  'В производстве': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Контроль качества': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Приостановлено': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Завершено': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'Отменено': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'default': 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
};

export const PURCHASE_REQUEST_STATUS_COLOR_MAP: Record<PurchaseRequestStatus | 'default', string> = {
  'Черновик': 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
  'Требует утверждения': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Утверждено': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  'Заказано': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Частично получено': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Получено': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'Отклонено': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'default': 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
};

export const EQUIPMENT_STATUS_COLOR_MAP: Record<EquipmentStatus, string> = {
  operational: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  in_use: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  maintenance: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  broken: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  operational: 'Свободно',
  in_use: 'Используется',
  maintenance: 'Обслуживание',
  broken: 'Неисправно',
};

export const KANBAN_COLUMN_COLORS: Record<string, string> = {
  'К выполнению': 'border-t-sky-500 dark:border-t-sky-400',
  'В процессе': 'border-t-amber-500 dark:border-t-amber-400',
  'Готово': 'border-t-emerald-500 dark:border-t-emerald-400',
};

export const USER_STATUS_COLOR_MAP: Record<UserStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700',
  trip: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900 dark:text-sky-200 dark:border-sky-700',
  vacation: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700',
  fired: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
};

export const TASK_STAGE_STYLES: Record<TaskStage, { pill: string, icon?: React.FC<React.SVGProps<SVGSVGElement>> }> = {
  'Потенциал': { pill: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700' },
  'Противоречия': { pill: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700' },
  'Решение': { pill: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-700' },
};

export const ATTENDANCE_TYPE_COLORS: Record<AttendanceEntry['type'], {bg: string, text: string, border?: string, pill?: string}> = {
  work: { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-800 dark:text-emerald-200', pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  late: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200', pill: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  excused_absence: { bg: 'bg-zinc-200 dark:bg-zinc-700', text: 'text-zinc-800 dark:text-zinc-200', pill: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200' },
  unexcused_absence: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', pill: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  trip: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', pill: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  remote: { bg: 'bg-sky-100 dark:bg-sky-900', text: 'text-sky-800 dark:text-sky-200', pill: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
};

export const ATTENDANCE_TYPE_LABELS: Record<AttendanceEntry['type'], string> = {
  work: 'Рабочий день', late: 'Опоздание', excused_absence: 'Отсутствие (уваж.)',
  unexcused_absence: 'Прогул', trip: 'Командировка', remote: 'Удалёнка',
};

export const PERFORMANCE_RATING_STYLES: Record<PerformanceReview['overallRating'], { label: string; pill: string }> = {
  needs_improvement: { label: 'Требует улучшения', pill: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  meets_expectations: { label: 'Соответствует ожиданиям', pill: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
  exceeds_expectations: { label: 'Превосходит ожидания', pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  outstanding: { label: 'Выдающийся результат', pill: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
};

export const TRANSACTION_TYPE_COLOR_MAP: Record<'income' | 'expense', { text: string, bg: string }> = {
  income: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  expense: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
};

export const MOBILE_NAV_CATEGORY_COLORS: Record<string, string> = {
  'Основные': 'bg-[#D6EAF6] hover:bg-[#C2DDEB] dark:bg-[#2C3E50] dark:hover:bg-[#34495E]',
  'Производство': 'bg-[#D7EED8] hover:bg-[#C3E4C4] dark:bg-[#2E4630] dark:hover:bg-[#395A3B]',
  'Коллектив': 'bg-[#F6D6D6] hover:bg-[#F0C2C2] dark:bg-[#5D3A3A] dark:hover:bg-[#724848]',
  'Бизнес': 'bg-[#FDE2C2] hover:bg-[#FCD8AE] dark:bg-[#6F4F28] dark:hover:bg-[#8A6332]',
  'Система': 'bg-[#E1D9F0] hover:bg-[#D1C5E6] dark:bg-[#4A3F6D] dark:hover:bg-[#5C4D89]',
  'default': 'bg-brand-secondary hover:bg-brand-secondary-hover',
};

export const MOBILE_NAV_CATEGORY_TEXT_COLORS: Record<string, string> = {
  'Основные': 'text-sky-950 dark:text-sky-100',
  'Производство': 'text-green-950 dark:text-green-100',
  'Коллектив': 'text-red-950 dark:text-red-100',
  'Бизнес': 'text-amber-950 dark:text-amber-100',
  'Система': 'text-violet-950 dark:text-violet-100',
  'default': 'text-brand-text-primary',
};

export const ROTATION_AREA_COLOR_MAP: Record<RotationArea, string> = {
  'Производство': 'bg-orange-500',
  'Коммуникации': 'bg-sky-500',
  'Стратегия': 'bg-purple-500',
  'Администрирование': 'bg-teal-500',
};
