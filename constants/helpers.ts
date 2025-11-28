// constants/helpers.ts
import { KanbanTask, KanbanTaskStatus, User } from '../types';
import { TASK_COMPLEXITY_OPTIONS } from './options';
import {
    HomeIcon, IdentificationIcon, ArchiveBoxIcon, ShoppingCartIcon, CogIcon as ProductionIcon,
    ViewColumnsIcon, ClipboardDocumentListIcon, BrainCircuitIcon, EnvelopeIcon,
    UsersIconDefault, Cog6ToothIcon, DocumentChartBarIcon, DocumentIcon, CubeTransparentIcon, CubeIcon,
    BeakerIcon, PlayCircleIcon, CalculatorIcon, BanknotesIcon, ArrowsUpDownIcon,
    ChatBubbleOvalLeftEllipsisIcon, BellIcon, ArrowTrendingUpIcon, CircleStackIcon, HeartIcon,
    CheckCircleIcon
} from '../components/UI/Icons';


export const ASSIGNEE_COLORS = [
  'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400',
  'bg-red-600', 'bg-blue-600', 'bg-green-600', 'bg-yellow-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600'
];

export const getAssigneeColor = (assigneeId: string | undefined | null): string => {
  if (!assigneeId) return 'bg-zinc-400';
  let hash = 0;
  for (let i = 0; i < assigneeId.length; i++) {
    hash = assigneeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % ASSIGNEE_COLORS.length);
  return ASSIGNEE_COLORS[index];
};

export const formatPhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '';
  let russianDigits = digits;
  if (russianDigits.startsWith('8') && russianDigits.length === 11) russianDigits = '7' + russianDigits.substring(1);
  else if (russianDigits.length === 10 && !russianDigits.startsWith('7')) russianDigits = '7' + russianDigits;
  if (russianDigits.startsWith('7') && russianDigits.length === 11) return `+${russianDigits.substring(0,1)}(${russianDigits.substring(1,4)})${russianDigits.substring(4,7)}-${russianDigits.substring(7,9)}-${russianDigits.substring(9,11)}`;
  return digits.length > 10 ? `+${digits}` : (digits.length > 4 ? `+${digits}` : phone);
};

export const getKanbanProgressPercentage = (status: KanbanTaskStatus, progress?: number): number => {
    if (status === KanbanTaskStatus.DONE) return 100;
    if (status === KanbanTaskStatus.IN_PROGRESS) return Math.max(progress || 0, 50);
    if (status === KanbanTaskStatus.TODO) return progress || 10;
    return 0;
};

export const calculateTaskCoefficient = (task: Partial<KanbanTask>): number => {
    let coefficient = 0;
    const complexityOpt = TASK_COMPLEXITY_OPTIONS.find(opt => opt.value === (task.complexity || 'medium'));
    coefficient += (complexityOpt?.weight || 2) * 5;
    if (task.priority === '1') coefficient += 10; else if (task.priority === '2') coefficient += 5; else if (task.priority === '3') coefficient += 2;
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate); const today = new Date();
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 3) coefficient += 8; else if (diffDays <= 7) coefficient += 4;
    }
    if (task.selfAssigned) coefficient += 3;
    return Math.max(1, Math.round(coefficient));
};

export const calculateReputationScore = (user: User, userTasks: KanbanTask[]): number => {
    let score = 50;
    if (user.employmentStartDate) {
        const startDate = new Date(user.employmentStartDate); const today = new Date();
        const months = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
        score += Math.min(months, 20); // Max 20 points for tenure
    }
    const completedTasks = userTasks.filter(t => t.status === KanbanTaskStatus.DONE && t.assigneeId === user.id);
    if (completedTasks.length > 0) {
        const totalCoefficient = completedTasks.reduce((sum, t) => sum + (t.coefficient || calculateTaskCoefficient(t)), 0);
        const avgCoefficient = totalCoefficient / completedTasks.length;
        score += Math.round(avgCoefficient * 0.5); // Bonus for complex tasks
        score += Math.min(completedTasks.length, 10); // Bonus for quantity, capped
    }
    (user.achievements || []).forEach(ach => { if (ach.impact === 'high') score += 10; else if (ach.impact === 'medium') score += 5; else score += 2; });
    const unexcusedAbsences = (user.attendance || []).filter(a => a.type === 'unexcused_absence').length;
    score -= unexcusedAbsences * 5;
    (user.disciplinaryActions || []).forEach(action => { if (action.severity === 'high') score -= 15; else if (action.severity === 'medium') score -= 7; else score -= 3; });
    return Math.max(0, Math.min(100, Math.round(score)));
};

export const getRandomTagColor = (): string => {
    const TAG_COLORS = [
        'bg-red-500 text-white', 'bg-blue-500 text-white', 'bg-green-500 text-white', 'bg-yellow-500 text-black',
        'bg-purple-500 text-white', 'bg-pink-500 text-white', 'bg-indigo-500 text-white', 'bg-teal-500 text-white',
        'bg-orange-500 text-white', 'bg-lime-500 text-black', 'bg-cyan-500 text-white', 'bg-fuchsia-500 text-white',
        'bg-rose-500 text-white', 'bg-sky-500 text-white', 'bg-emerald-500 text-white', 'bg-amber-500 text-black',
    ];
    return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

export const IconComponents = {
    HomeIcon, IdentificationIcon, ArchiveBoxIcon, ShoppingCartIcon, ProductionIcon,
    ViewColumnsIcon, ClipboardDocumentListIcon, BrainCircuitIcon, EnvelopeIcon,
    UsersIconDefault, Cog6ToothIcon, DocumentChartBarIcon, DocumentIcon, CubeTransparentIcon, CubeIcon,
    BeakerIcon, PlayCircleIcon, CalculatorIcon, BanknotesIcon, ArrowsUpDownIcon,
    ChatBubbleOvalLeftEllipsisIcon, BellIcon, ArrowTrendingUpIcon, CircleStackIcon, HeartIcon
};

export const TASK_STAGE_COMPLETED_ICON = CheckCircleIcon;