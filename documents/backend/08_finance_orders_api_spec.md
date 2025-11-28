# Спецификация API: Финансы и Сбыт (Finance & Sales Domain)

## Общие сведения
Этот домен управляет денежными потоками и взаимодействием с клиентами.
Принцип: **"Деньги — это эквивалент труда"**. Никаких скрытых транзакций.

**Base URL:** `/finance` и `/sales`

---

## 1. Заказы (Sales Orders)
**Base URL:** `/sales/orders`

### 1.1 Список Заказов
**Эндпоинт:** `GET /`

**Query Parameters:**
*   `status`: OrderStatus
*   `paymentStatus`: 'paid' | 'unpaid'
*   `search`: string

**Response (200 OK):**
```json
[
  {
    "id": "ord-1",
    "customerName": "Иван Петров",
    "amount": 5000,
    "status": "NEW",
    "productionStatus": "PLANNED", // Join c ProductionOrder
    "margin": 1200 // Вычисляемое поле (Цена - Себестоимость ПЗ)
  }
]
```

### 1.2 Создание Заказа
**Эндпоинт:** `POST /`

**Request Body:**
```json
{
  "contactId": "contact-1",
  "items": [
    { "warehouseItemId": "item-1", "quantity": 10, "price": 500 }
  ],
  "deliveryType": "delivery"
}
```

### 1.3 Генерация Документов (RPC)
**Эндпоинт:** `POST /:id/documents`

**Body:** `{ "type": "INVOICE" | "WAYBILL" }`

*Логика Бэкенда:*
1.  Генерирует номер документа (последовательный).
2.  Создает PDF (в будущем) или JSON-структуру документа.
3.  Меняет статус заказа (например, `isInvoiceSent = true`).

---

## 2. Финансы (Finance)
**Base URL:** `/finance`

### 2.1 Транзакции
**Эндпоинт:** `GET /transactions`

**Query:**
*   `type`: 'income' | 'expense'
*   `category`: string
*   `dateFrom`: ISO Date
*   `dateTo`: ISO Date

### 2.2 Добавить Транзакцию
**Эндпоинт:** `POST /transactions`

**Body:**
```json
{
  "type": "EXPENSE",
  "amount": 1000,
  "category": "Закупка сырья",
  "description": "Оплата поставки №123",
  "isTaxDeductible": true,
  "relatedEntityId": "pr-001" // Связь с Закупкой или ПЗ
}
```

### 2.3 Финансовая Сводка (Monthly Expense)
**Эндпоинт:** `GET /expenses/:year/:month`

Возвращает агрегированные данные за месяц.

**Response:**
```json
{
  "id": "2025-10",
  "totalIncome": 500000, // Агрегация транзакций income
  "directExpenses": 120000, // Агрегация транзакций expense
  "manualExpenses": { // Косвенные расходы (вводятся вручную)
    "rent": 50000,
    "cleaning": 5000
  },
  "calculatedExpenses": { // Расчетные
    "depreciation": 12000,
    "electricity": 8000
  },
  "netProfit": 305000
}
```

### 2.4 Закрытие Месяца (RPC)
**Эндпоинт:** `POST /expenses/:year/:month/close`

*Логика Бэкенда (Смарт-контракт):*
1.  Фиксирует все показатели.
2.  Рассчитывает 20% (или текущую ставку) от `netProfit`.
3.  Создает транзакцию перевода в `CollectiveFund`.
4.  Блокирует редактирование расходов за этот месяц.