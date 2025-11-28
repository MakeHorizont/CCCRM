
export type SystemEventType = 
  | 'auth'          // Вход/выход
  | 'user_update'   // Изменение профиля, прав, зарплаты
  | 'finance'       // Транзакции, изменение настроек фонда
  | 'production'    // Изменение техкарт, списание
  | 'security'      // Попытки доступа
  | 'admin';        // Изменение глобальных настроек

export interface SystemEvent {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  type: SystemEventType;
  action: string;       // Краткое название действия (например, "Изменение оклада")
  details: string;      // Подробности (было -> стало)
  entityId?: string;    // ID затронутого объекта (например, ID пользователя)
  entityType?: string;  // Тип объекта (User, Order, etc.)
  meta?: any;           // Дополнительные технические данные
}
