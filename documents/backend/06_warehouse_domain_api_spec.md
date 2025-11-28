# Спецификация API: Складской Домен (Warehouse & Logistics)

## Общие сведения
Этот домен отвечает за учет всех материальных ценностей предприятия: готовой продукции, сырья, инвентаря и мест их хранения.

**Base URL:** `/warehouse`

---

## 1. Готовая Продукция (Warehouse Items)

Товары, произведенные предприятием и готовые к реализации.

### 1.1 Получение списка товаров
**Эндпоинт:** `GET /items`

**Query Parameters:**
*   `search`: string (поиск по названию или SKU)
*   `archived`: boolean (показать архивные, default: false)
*   `lowStock`: boolean (только с низким остатком)

**Response (200 OK):**
```json
[
  {
    "id": "tmp-001",
    "name": "Темпе Классический",
    "sku": "TMP-CLS-250",
    "quantity": 100,
    "price": 250,
    "locationId": "loc-1",
    "locationName": "Холодильник №1", // Backend performs join
    "lowStockThreshold": 20,
    "openIncidentsCount": 0,
    "updatedAt": "2023-10-27T10:00:00Z"
  }
]
```

### 1.2 Создание товара
**Эндпоинт:** `POST /items`

**Request Body:**
```json
{
  "name": "Новый Товар",
  "sku": "NEW-001",
  "quantity": 0,
  "price": 300,
  "locationId": "loc-2",
  "billOfMaterials": [ // Опционально при создании
    { "householdItemId": "hh-001", "quantityPerUnit": 0.15 }
  ]
}
```

### 1.3 Обновление товара
**Эндпоинт:** `PATCH /items/:id`

**Request Body:** (Partial)
```json
{
  "quantity": 50,
  "price": 350
}
```
*Примечание: Прямое изменение количества через этот эндпоинт должно создавать запись в истории движений с типом "CORRECTION". Для производственных списаний используются другие процессы.*

### 1.4 Архивация
**Эндпоинт:** `POST /items/:id/archive`
**Body:** `{ "archive": true }`

### 1.5 Инциденты с товаром
**Эндпоинт:** `GET /items/:id/incidents`
**Response:** Список инцидентов (WarehouseItemIncident).

---

## 2. Хозяйственный Учет (Household Items / Raw Materials)

Сырье, упаковка, хозтовары.

### 2.1 Получение списка сырья
**Эндпоинт:** `GET /household-items`

**Query Parameters:**
*   `category`: string (Сырьё, Упаковка, etc.)
*   `search`: string

**Response (200 OK):**
```json
[
  {
    "id": "hh-001",
    "name": "Соя",
    "category": "Сырьё",
    "quantity": 500,
    "unit": "кг",
    "price": 120, // Себестоимость закупки
    "lowStockThreshold": 50
  }
]
```

### 2.2 Операции с сырьем
*   `POST /household-items` - Создать
*   `PATCH /household-items/:id` - Обновить
*   `DELETE /household-items/:id` - Удалить (если не используется в BOM)

---

## 3. Места Хранения (Storage Locations)

### 3.1 Список мест
**Эндпоинт:** `GET /locations`

**Response:**
```json
[
  {
    "id": "loc-1",
    "name": "Холодильник Готовой Продукции",
    "tags": [{ "id": "tag-1", "name": "Холод", "color": "blue" }],
    "equipmentId": "equip-7" // Связь с оборудованием (если есть)
  }
]
```

---

## 4. Инциденты (Incidents)

### 4.1 Регистрация инцидента
**Эндпоинт:** `POST /incidents`

**Request Body:**
```json
{
  "warehouseItemId": "tmp-001",
  "type": "damage", // damage, shortage, defect
  "description": "Упаковка повреждена при транспортировке",
  "attachments": [] // Файлы
}
```
*Backend автоматически проставляет userId из токена.*

### 4.2 Решение инцидента
**Эндпоинт:** `POST /incidents/:id/resolve`

**Request Body:**
```json
{
  "notes": "Товар списан в брак."
}
```
