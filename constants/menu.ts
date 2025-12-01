
// constants/menu.ts
import React from 'react';
import {
    HomeIcon, ArchiveBoxIcon, ShoppingCartIcon, ViewColumnsIcon, ClipboardDocumentListIcon, Cog6ToothIcon,
    ArrowLeftOnRectangleIcon, IdentificationIcon, UsersIconDefault, LinkIcon, PhoneIcon, CubeTransparentIcon,
    ChevronDownIcon, CheckCircleIcon, CubeIcon, BrainCircuitIcon, EnvelopeIcon, PaperAirplaneIcon, UserCircleIcon,
    PlusCircleIcon as PlusCircleIconDefault, CogIcon as ProductionIcon, CogIcon as CogIconImport, DocumentChartBarIcon,
    DocumentIcon, BeakerIcon, PlayCircleIcon, CalculatorIcon, BanknotesIcon, ArrowsUpDownIcon,
    ChatBubbleOvalLeftEllipsisIcon, BellIcon, ArrowTrendingUpIcon, CircleStackIcon, BriefcaseIcon, SparklesIcon,
    AwardIcon, ListBulletIcon, DocumentChartBarIcon as ChartBarIcon, HeartIcon, FlagIcon, ArrowPathIcon, EyeIcon, ScaleIcon,
    ChartPieIcon, ShieldCheckIcon // Added ShieldCheckIcon
} from '../components/UI/Icons';
import { User } from '../types';
import { ROUTE_PATHS } from './paths';

export interface MenuItem {
  name: string;
  path?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  iconName: string;
  isParent?: boolean;
  isHeader?: boolean;
  subMenu?: SubMenuItem[];
  requiredRole?: User['role'];
  requiredPermission?: string;
}

export interface SubMenuItem {
  name: string;
  path: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  iconName: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { name: 'Панель управления', path: ROUTE_PATHS.DASHBOARD, icon: HomeIcon, iconName: 'HomeIcon' },
  { name: 'Аналитика', path: ROUTE_PATHS.ANALYTICS, icon: ChartPieIcon, iconName: 'ChartPieIcon' },
  
  { name: 'Производство', isHeader: true, icon: ProductionIcon, iconName: 'ProductionIcon' },
  { name: 'Заказы', path: ROUTE_PATHS.ORDERS, icon: ShoppingCartIcon, iconName: 'ShoppingCartIcon' },
  { name: 'Произв. задания', path: ROUTE_PATHS.PRODUCTION, icon: ProductionIcon, iconName: 'ProductionIcon' },
  { name: 'ОТК (Качество)', path: ROUTE_PATHS.QUALITY_CONTROL, icon: ShieldCheckIcon, iconName: 'ShieldCheckIcon' }, // New Item
  { name: 'Технологии', path: ROUTE_PATHS.TECHNOLOGIES, icon: BeakerIcon, iconName: 'BeakerIcon' },
  { name: 'Оборудование', path: ROUTE_PATHS.EQUIPMENT, icon: CubeIcon, iconName: 'CubeIcon' },
  { name: 'Закупки', path: ROUTE_PATHS.PURCHASING, icon: CalculatorIcon, iconName: 'CalculatorIcon' },
  {
    name: 'Склад',
    icon: ArchiveBoxIcon,
    iconName: 'ArchiveBoxIcon',
    isParent: true,
    subMenu: [
      { name: 'Товары', path: ROUTE_PATHS.WAREHOUSE, icon: CubeTransparentIcon, iconName: 'CubeTransparentIcon' },
      { name: 'Хоз. Учёт', path: ROUTE_PATHS.HOUSEHOLD_ACCOUNTING, icon: CubeIcon, iconName: 'CubeIcon' },
      { name: 'Хранилища', path: ROUTE_PATHS.STORAGES, icon: ArchiveBoxIcon, iconName: 'ArchiveBoxIcon' },
    ]
  },

  { name: 'Коллектив', isHeader: true, icon: UsersIconDefault, iconName: 'UsersIconDefault' },
  { name: 'Совет (Власть)', path: ROUTE_PATHS.COUNCIL, icon: ScaleIcon, iconName: 'ScaleIcon' },
  { name: 'Обсуждения', path: ROUTE_PATHS.DISCUSSIONS, icon: ChatBubbleOvalLeftEllipsisIcon, iconName: 'ChatBubbleOvalLeftEllipsisIcon' },
  {
    name: 'Коллективный Фонд',
    icon: CircleStackIcon,
    iconName: 'CircleStackIcon',
    isParent: true,
    subMenu: [
      { name: 'Обзор Фонда', path: ROUTE_PATHS.COLLECTIVE_FUND_OVERVIEW, icon: CircleStackIcon, iconName: 'CircleStackIcon' },
      { name: 'Соц. Инициативы', path: ROUTE_PATHS.COLLECTIVE_FUND_INITIATIVES, icon: HeartIcon, iconName: 'HeartIcon' },
    ]
  },
  { name: 'Устав', path: ROUTE_PATHS.CHARTER, icon: FlagIcon, iconName: 'FlagIcon' },
  { name: 'Ротация Задач', path: ROUTE_PATHS.ROTATION, icon: ArrowPathIcon, iconName: 'ArrowPathIcon' },
  { name: 'База знаний', path: ROUTE_PATHS.KNOWLEDGE_BASE, icon: BrainCircuitIcon, iconName: 'BrainCircuitIcon' },
  { name: 'Коллектив', path: ROUTE_PATHS.HIERARCHY_MANAGEMENT, icon: UsersIconDefault, iconName: 'UsersIconDefault', requiredRole: 'ceo', requiredPermission: 'manage_user_hierarchy'},
  
  { name: 'Бизнес', isHeader: true, icon: ArrowTrendingUpIcon, iconName: 'ArrowTrendingUpIcon' },
  { name: 'Контакты', path: ROUTE_PATHS.CONTACTS, icon: IdentificationIcon, iconName: 'IdentificationIcon' },
  {
    name: 'Фин. Учет',
    icon: BanknotesIcon,
    iconName: 'BanknotesIcon',
    isParent: true,
    subMenu: [
      { name: 'Транзакции', path: ROUTE_PATHS.TRANSACTIONS, icon: ArrowsUpDownIcon, iconName: 'ArrowsUpDownIcon' },
      { name: 'Финансовая сводка', path: ROUTE_PATHS.FINANCIAL_ACCOUNTING, icon: CalculatorIcon, iconName: 'CalculatorIcon' },
    ]
  },
  { name: 'Kanban', path: ROUTE_PATHS.KANBAN_HOME,  icon: ViewColumnsIcon, iconName: 'ViewColumnsIcon' },
  { name: 'Стратег. планы', path: ROUTE_PATHS.STRATEGY, icon: ClipboardDocumentListIcon, iconName: 'ClipboardDocumentListIcon' },
  { name: 'Документы', path: ROUTE_PATHS.DOCUMENTS, icon: DocumentChartBarIcon, iconName: 'DocumentChartBarIcon' },
  { name: 'Почта', path: ROUTE_PATHS.MAIL, icon: EnvelopeIcon, iconName: 'EnvelopeIcon' },

  { name: 'Система', isHeader: true, icon: Cog6ToothIcon, iconName: 'Cog6ToothIcon' },
  { name: 'Журнал Событий', path: ROUTE_PATHS.AUDIT_LOG, icon: EyeIcon, iconName: 'EyeIcon' },
  { name: 'Настройки', path: ROUTE_PATHS.SETTINGS, icon: Cog6ToothIcon, iconName: 'Cog6ToothIcon' },
];

export const LOGOUT_MENU_ITEM: MenuItem = {
  name: 'Выход',
  path: '#logout',
  icon: ArrowLeftOnRectangleIcon,
  iconName: 'ArrowLeftOnRectangleIcon'
};

export interface MobileNavItemConfig {
  id: string;
  label: string;
  iconName: string;
  path: string;
  isVisible: boolean;
  colorClass?: string;
  textColorClass?: string;
}

export const MENU_ITEMS_FOR_MOBILE_NAV: MobileNavItemConfig[] = MENU_ITEMS.reduce((acc, item) => {
  if (item.isParent && item.subMenu) {
    item.subMenu.forEach(sub => {
      acc.push({
        id: sub.path,
        label: sub.name,
        iconName: sub.iconName,
        path: sub.path,
        isVisible: true,
      });
    });
  } else if (item.path) {
    const colorClass = item.path === ROUTE_PATHS.DOCUMENTS ? 'bg-amber-600 hover:bg-amber-500' : undefined;
    acc.push({
      id: item.path,
      label: item.name,
      iconName: item.iconName,
      path: item.path,
      isVisible: true,
      colorClass: colorClass,
    });
  }
  return acc;
}, [] as MobileNavItemConfig[]);

const ensureCoreItems = (config: MobileNavItemConfig[]): MobileNavItemConfig[] => {
    const corePaths = [
        ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.ANALYTICS, ROUTE_PATHS.ORDERS, ROUTE_PATHS.DOCUMENTS, ROUTE_PATHS.PRODUCTION,
        ROUTE_PATHS.WAREHOUSE, ROUTE_PATHS.KANBAN_HOME, ROUTE_PATHS.KNOWLEDGE_BASE, ROUTE_PATHS.COUNCIL, ROUTE_PATHS.QUALITY_CONTROL
    ];
    let result = [...config];
    corePaths.forEach(corePath => {
        if (!result.some(item => item.id === corePath)) {
            const menuItem = MENU_ITEMS.find(mi => mi.path === corePath) || 
                             MENU_ITEMS.flatMap(mi => mi.subMenu || []).find(smi => smi.path === corePath);
            if (menuItem) {
                result.push({
                    id: corePath,
                    label: menuItem.name || 'N/A',
                    iconName: menuItem.iconName || 'DocumentIcon',
                    path: corePath,
                    isVisible: true,
                });
            }
        }
    });
    return result;
};

export const initialMobileNavItems = ensureCoreItems(MENU_ITEMS_FOR_MOBILE_NAV);