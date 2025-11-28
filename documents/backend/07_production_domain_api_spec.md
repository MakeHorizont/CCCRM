# Спецификация API: Производственный Домен (Production Domain)

## Общие сведения
Этот домен — "сердце" системы. Он управляет трансформацией сырья в готовую продукцию.
Бэкенд здесь выступает гарантом материальной истины: нельзя произвести то, на что нет ресурсов.

**Base URL:** `/production`

---

## 1. Производственные Задания (Production Orders)

### 1.1 Список Заданий
**Эндпоинт:** `GET /orders`

**Query Parameters:**
*   `status`: string (фильтр по статусу)
*   `search`: string
*   `archived`: boolean

**Response (200 OK):**
```json
[
  {
    "id": "PO-1001",
    "name": "Партия Темпе #1001",
    "status": "IN_PROGRESS", // 'В производстве'
    "hasMaterialShortage": false, // Вычисляется бэкендом на лету
    "assignedToId": "user-1",
    "assigneeName": "Иван Иванов", // Join
    "progress": 45, // % выполнения
    "createdAt": "..."
  }
]
```

### 1.2 Создание Задания
**Эндпоинт:** `POST /orders`

**Request Body:**
```json
{
  "name": "Партия Чипсов",
  "items": [
    { "warehouseItemId": "item-1", "plannedQuantity": 100 }
  ],
  "assignedToId": "user-2",
  "plannedDate": "2025-10-20"
}
```
*Примечание:* При создании Бэкенд проверяет наличие техкарты (TechnologyCard) для выбранных товаров. Если карты нет — ошибка 400.

### 1.3 Детальная информация
**Эндпоинт:** `GET /orders/:id`

Возвращает полную структуру, включая `orderItems` и их текущий статус выполнения (`productionRun`).

### 1.4 Запуск/Смена статуса (RPC)
**Эндпоинт:** `POST /orders/:id/transition`

**Body:** `{ "targetStatus": "IN_PROGRESS" }`

*Логика Бэкенда:*
1.  Проверить наличие сырья (Physics Engine).
2.  Если сырья нет и режим == "MOBILIZATION" -> Ошибка 403.
3.  Если сырья нет и режим == "DEVELOPMENT" -> Предупреждение (или смена статуса на "AWAITING_MATERIALS").

### 1.5 Обновление Шага Выполнения (Production Run Step)
**Эндпоинт:** `PATCH /orders/:id/items/:itemId/steps/:stepId`

Рабочий отмечает выполнение шага на планшете.

**Body:**
```json
{
  "completed": true,
  "actualQuantity": 10.5, // Фактически использовано сырья
  "wasteQuantity": 0.2    // Потери
}
```

---

## 2. Технологии (Technology Cards)

### 2.1 Список Техкарт
**Эндпоинт:** `GET /technologies`

### 2.2 Создание/Версионирование
**Эндпоинт:** `POST /technologies`

Создает новую карту или новую версию существующей. Старая версия архивируется автоматически.

**Body:**
```json
{
  "warehouseItemId": "item-1",
  "steps": [
    { "type": "INGREDIENT", "componentId": "hh-1", "quantity": 0.5 },
    { "type": "ACTION", "description": "Варка", "durationMinutes": 60 }
  ]
}
```

---

## 3. Оборудование (Equipment)

### 3.1 Список
**Эндпоинт:** `GET /equipment`

### 3.2 Статус Оборудования
**Эндпоинт:** `GET /equipment/:id/status`

Показывает, занято ли оборудование в текущих активных ПЗ.

### 3.3 CRUD
*   `POST /equipment`
*   `PATCH /equipment/:id`
*   `DELETE /equipment/:id` (Soft delete)
