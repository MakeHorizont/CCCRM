
# Спецификация API: Планирование и Координация (Strategy & Kanban)

## Общие сведения
Этот домен связывает долгосрочное планирование (Стратегия) с оперативным исполнением (Kanban).
Принцип: **"От Плана к Производству"**.

**Base URL:** `/strategy` и `/kanban`

---

## 1. Стратегические Планы (Strategic Plans)
**Base URL:** `/strategy/plans`

### 1.1 Список Планов
**Эндпоинт:** `GET /`
**Query:** `archived=true|false`

### 1.2 Создание Плана
**Эндпоинт:** `POST /`
**Body:**
```json
{
  "title": "Захват рынка Москвы",
  "description": "План на 2026 год",
  "owner": "Иванов И.И.",
  "timeline": "2026"
}
```

### 1.3 Работа с Подзадачами (Subtasks)
Поскольку структура древовидная, мы используем вложенные ресурсы или плоский список с `parentId`.

**Создать подзадачу:** `POST /:planId/subtasks`
**Обновить подзадачу:** `PATCH /:planId/subtasks/:subtaskId`
**Переместить (Drag&Drop):** `POST /:planId/subtasks/reorder`
**Body:**
```json
{
  "subtaskId": "sub-1",
  "newParentId": "sub-2", // или null, если корень
  "newIndex": 3
}
```

---

## 2. Kanban
**Base URL:** `/kanban`

### 2.1 Доски (Boards)
*   `GET /boards` - Получить доступные доски (с учетом прав доступа).
*   `POST /boards` - Создать доску.

### 2.2 Задачи (Tasks)
**Эндпоинт:** `GET /tasks`

**Query:**
*   `boardId`: string
*   `assigneeId`: string
*   `status`: 'TODO' | 'IN_PROGRESS' | 'DONE'
*   `showInMyTasks`: boolean

### 2.3 Создание Задачи
**Эндпоинт:** `POST /tasks`

**Body:**
```json
{
  "title": "Разработать логотип",
  "boardIds": ["board-marketing"],
  "strategicSubTaskId": "sub-123" // Связь со стратегией!
}
```

### 2.4 Синхронизация со Стратегией (Backend Logic)
При обновлении статуса задачи в Kanban (`PATCH /tasks/:id`):
1.  Если у задачи есть `strategicSubTaskId`:
2.  Бэкенд находит соответствующую `StrategicSubTask`.
3.  Если статус `DONE` -> `SubTask.progress = 100`, `SubTask.completed = true`.
4.  Если статус `IN_PROGRESS` -> `SubTask.progress = 50` (если было 0).
5.  Обновляет `updatedAt` у родительского Плана.

### 2.5 Диалектика Задачи
**Эндпоинт:** `POST /tasks/:id/stages`

Добавление записи в историю размышлений (Потенциал, Противоречия, Решение).

**Body:**
```json
{
  "stage": "contradictions",
  "text": "Нет бюджета на аутсорс, а своих дизайнеров мало."
}
```
