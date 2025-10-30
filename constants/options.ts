// constants/options.ts
import { OrderStatus, HouseholdCategory, EquipmentCategory, UserStatus, TaskStage, TaskDifficulty, TransactionCategory } from '../types';
import { SocialMediaLinks } from '../types';
import { LinkIcon, PhoneIcon } from '../components/UI/Icons';
import React from 'react';

export const ALL_ORDER_STATUSES: OrderStatus[] = [
  'Новый', 'Может быть собран', 'Не может быть собран', 'В обработке', 'Собран',
  'Отправлен', 'Доставлен', 'Отменен', 'Возврат', 'Частичный возврат'
];

export const SOCIAL_MEDIA_PLATFORMS: Record<keyof SocialMediaLinks, { label: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; placeholder: string; baseUrl?: string }> = {
  instagram: { label: 'Instagram', icon: LinkIcon, placeholder: 'username', baseUrl: 'https://instagram.com/' },
  telegram: { label: 'Telegram', icon: LinkIcon, placeholder: '@username or t.me/link', baseUrl: 'https://t.me/' },
  whatsapp: { label: 'WhatsApp', icon: PhoneIcon, placeholder: '+79991234567', baseUrl: 'https://wa.me/' },
  vk: { label: 'VK', icon: LinkIcon, placeholder: 'id or shortname', baseUrl: 'https://vk.com/' },
  tiktok: { label: 'TikTok', icon: LinkIcon, placeholder: '@username', baseUrl: 'https://tiktok.com/@' },
};

export const HOUSEHOLD_CATEGORIES: HouseholdCategory[] = [
  'Упаковка', 'Сырьё', 'Специи', 'Масла', 'Хозы', 'Сантехника', 'Электрика'
];

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
    'Подготовка сырья', 'Термообработка', 'Смешивание и охлаждение', 'Упаковка', 'Хранение', 'Вспомогательное', 'Освещение', 'Другое'
];

export const USER_STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Работает' }, { value: 'trip', label: 'Командировка' },
  { value: 'vacation', label: 'Отпуск' }, { value: 'fired', label: 'Уволен' },
];

export const TASK_STAGES_ORDER: ReadonlyArray<TaskStage> = ['Потенциал', 'Противоречия', 'Решение'];

export const TASK_COMPLEXITY_OPTIONS: { value: TaskDifficulty, label: string, weight: number }[] = [
    { value: 'low', label: 'Низкая', weight: 1 }, { value: 'medium', label: 'Средняя', weight: 2 }, { value: 'high', label: 'Высокая', weight: 3 },
];

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  'Продажа товара', 'Закупка сырья', 'Закупка хоз.товаров', 'Аренда', 'Коммунальные услуги', 'Зарплата', 'Премия', 'Ремонт и обслуживание', 'Маркетинг и реклама', 'Налоги', 'Отчисления в фонды', 'Прочее'
];

export const TAG_COLORS = [
  'bg-red-500 text-white', 'bg-blue-500 text-white', 'bg-green-500 text-white', 'bg-yellow-500 text-black',
  'bg-purple-500 text-white', 'bg-pink-500 text-white', 'bg-indigo-500 text-white', 'bg-teal-500 text-white',
  'bg-orange-500 text-white', 'bg-lime-500 text-black', 'bg-cyan-500 text-white', 'bg-fuchsia-500 text-white',
  'bg-rose-500 text-white', 'bg-sky-500 text-white', 'bg-emerald-500 text-white', 'bg-amber-500 text-black',
];

export const BONUS_PER_COEFFICIENT_POINT = 100;
