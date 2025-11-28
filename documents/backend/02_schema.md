# Схема Базы Данных (Prisma Specification)

Поскольку система не позволяет создавать файлы `.prisma` напрямую, здесь приведена спецификация в формате Markdown. При инициализации бэкенда этот код должен быть помещен в `schema.prisma`.

## Основные Сущности

### 1. Пользователи и Иерархия
Отражает структуру коллектива и ролей.

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          UserRole  @default(EMPLOYEE)
  status        UserStatus @default(ACTIVE)
  
  // Экономика труда
  dailyRate           Float     @default(0) // Базовая ставка
  reputationScore     Int       @default(50)
  
  // Связи
  managerId     String?
  manager       User?     @relation("Management", fields: [managerId], references: [id])
  subordinates  User[]    @relation("Management")
  
  tasks         KanbanTask[]
  auditLogs     SystemEvent[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum UserRole {
  EMPLOYEE
  MANAGER
  CEO
}

enum UserStatus {
  ACTIVE
  TRIP
  VACATION
  FIRED
}
```

### 2. Аудит и "Стеклянный Завод"
Неизменяемый журнал всех критических действий.

```prisma
model SystemEvent {
  id          String   @id @default(uuid())
  timestamp   DateTime @default(now())
  
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  type        EventType
  action      String   // Краткое описание
  details     String   // JSON или текст с подробностями
  
  entityId    String?  // ID затронутого объекта
  entityType  String?  // Тип объекта (Order, User, etc)
}

enum EventType {
  AUTH
  FINANCE
  PRODUCTION
  SECURITY
  ADMIN
}
```

### 3. Производство и Материальный Мир
"Физический движок" экономики.

```prisma
model WarehouseItem {
  id        String   @id @default(uuid())
  sku       String   @unique
  name      String
  quantity  Float    @default(0)
  
  // ... остальные поля
}

model ProductionOrder {
  id          String   @id @default(uuid())
  status      ProductionStatus @default(PLANNED)
  
  // Связи
  items       ProductionOrderItem[]
  
  // Экономика партии
  calculatedCost Float?
  
  createdAt   DateTime @default(now())
}

model ProductionOrderItem {
  id                  String @id @default(uuid())
  productionOrderId   String
  productionOrder     ProductionOrder @relation(fields: [productionOrderId], references: [id])
  
  warehouseItemId     String
  plannedQuantity     Float
  producedQuantity    Float @default(0)
}
```

### 4. Коллективный Фонд
Механизм перераспределения прибавочной стоимости.

```prisma
model CollectiveFund {
  id                      String @id @default("main_fund") // Singleton
  balance                 Float  @default(0)
  contributionPercentage  Float  @default(15)
  
  updatedAt               DateTime @updatedAt
}

model FundTransaction {
  id          String   @id @default(uuid())
  amount      Float
  type        FundTxType
  description String
  createdAt   DateTime @default(now())
}

enum FundTxType {
  CONTRIBUTION // Взнос от прибыли
  EXPENSE      // Трата на инициативу
}
```
