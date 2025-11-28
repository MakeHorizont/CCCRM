
# Стандарты REST API (Соглашение о взаимодействии)

Этот документ определяет правила игры между Frontend (React) и Backend (NestJS). Соблюдение этих стандартов обязательно для всех разработчиков.

## 1. Общие Принципы
*   **Resource-Oriented:** URL строится вокруг существительных (ресурсов), а не глаголов.
    *   ✅ `GET /orders`
    *   ❌ `GET /getOrders`
*   **JSON everywhere:** Все запросы и ответы используют `Content-Type: application/json`.
*   **Snake_case в JSON:** Поля в JSON должны быть в `snake_case` (стандарт БД), но наш Frontend исторически использует `camelCase`.
    *   *Решение:* Бэкенд (NestJS) будет использовать `class-transformer` для автоматической конвертации `snake_case` (DB) <-> `camelCase` (API DTO). **API отдает camelCase.**

## 2. Формат Ответа (Envelope)
Мы не используем обертки типа `{ data: ... }` для успешных ответов, чтобы упростить типизацию на фронте. Массив возвращается как массив, объект как объект.

**Успех (200 OK):**
```json
[
  { "id": "1", "name": "Order 1" },
  { "id": "2", "name": "Order 2" }
]
```

**Ошибка (4xx, 5xx):**
Всегда возвращается стандартный `HttpException` формат NestJS.
```json
{
  "statusCode": 400,
  "message": "Недостаточно товара на складе",
  "error": "Bad Request",
  "timestamp": "2025-10-07T23:48:00Z",
  "path": "/api/v1/production/start"
}
```

## 3. Стандартные Методы и Коды

| Метод  | Назначение | Код Успеха | Примечание |
| :--- | :--- | :--- | :--- |
| `GET` | Чтение списка или одной сущности | 200 OK | Идемпотентный |
| `POST` | Создание новой сущности | 201 Created | Возвращает созданный объект |
| `PUT` | Полная замена сущности | 200 OK | Используем редко |
| `PATCH` | Частичное обновление | 200 OK | Основной метод редактирования |
| `DELETE` | Удаление сущности | 200 OK | Возвращает `{ success: true }` |

## 4. Пагинация, Фильтрация, Сортировка
Используем query parameters.

*   **Пагинация:** `?page=1&limit=20`
*   **Сортировка:** `?sort=createdAt:desc` (поле:направление)
*   **Поиск:** `?search=query_string`
*   **Фильтры:** `?status=active&type=income`

## 5. Специальные Действия (RPC-style)
Для действий, которые не укладываются в CRUD (например, "Запустить производство", "Рассчитать налог"), используем вложенные ресурсы или глаголы в конце пути (как исключение).

*   `POST /production-orders/:id/start` — Запуск ПЗ (создает транзакцию списания).
*   `POST /finance/calculate-tax` — Расчет налога (не сохраняет, просто считает).
*   `POST /auth/login` — Вход.

## 6. Аутентификация
*   Заголовок: `Authorization: Bearer <token>`
*   Токен получаем через `POST /auth/login`.
*   Срок жизни токена: 1 день (для удобства рабочих на планшетах).

## 7. Версионирование
Префикс URL: `/api/v1/...`

## 8. Примеры Эндпоинтов (Draft)

### Auth
*   `POST /auth/login` -> `{ accessToken: string, user: User }`
*   `GET /auth/me` -> `{ user: User }`

### Warehouse
*   `GET /warehouse/items`
*   `POST /warehouse/items`
*   `PATCH /warehouse/items/:id`

### Production
*   `POST /production/orders` — Создать черновик ПЗ.
*   `POST /production/orders/:id/run` — Взять в работу (смена статуса).
*   `POST /production/orders/:id/complete` — Завершить (списание сырья, выпуск продукции).
