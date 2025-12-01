
# Спецификация API: Контроль Качества (Quality Control)

## Общие сведения
Этот модуль обеспечивает контроль соответствия продукции и сырья установленным стандартам.
Принцип: **"Брак не должен пройти дальше"**.

**Base URL:** `/quality`

---

## 1. Проверки Качества (Quality Checks)

### 1.1 Список Проверок
**Эндпоинт:** `GET /checks`

**Query Parameters:**
*   `status`: 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL'
*   `type`: 'INCOMING' | 'PRODUCTION' | 'FINAL' | 'STORAGE'
*   `relatedEntityId`: string (ID ПЗ или Товара)
*   `dateFrom`: ISO Date
*   `dateTo`: ISO Date

**Response (200 OK):**
```json
[
  {
    "id": "qc-101",
    "checkNumber": "QC-2023-101",
    "type": "FINAL",
    "status": "PASSED",
    "relatedEntityId": "PO-1001",
    "relatedEntityType": "ProductionOrder",
    "inspectorId": "user-3",
    "inspectorName": "Сергей Смирнов",
    "date": "2023-10-27T10:00:00Z"
  }
]
```

### 1.2 Создание Проверки (Карта Проверки)
**Эндпоинт:** `POST /checks`

Создает "пустой лист" проверки с набором параметров, которые нужно измерить.

**Request Body:**
```json
{
  "type": "FINAL",
  "relatedEntityId": "PO-1001",
  "relatedEntityType": "ProductionOrder",
  "plannedDate": "2023-10-27",
  "parameters": [
    { "name": "Влажность", "normativeValue": "10-12%", "isCritical": true },
    { "name": "Цвет", "normativeValue": "Белый мицелий", "isCritical": true },
    { "name": "Вес упаковки", "normativeValue": "250г +/- 5г", "isCritical": false }
  ]
}
```

### 1.3 Внесение Результатов (Проведение проверки)
**Эндпоинт:** `PATCH /checks/:id/result`

Инспектор вносит фактические значения.

**Request Body:**
```json
{
  "status": "PASSED", // Итоговый вердикт
  "notes": "Качество отличное",
  "parameters": [
    { "name": "Влажность", "actualValue": "11%" },
    { "name": "Цвет", "actualValue": "Соответствует" },
    { "name": "Вес упаковки", "actualValue": "252г" }
  ]
}
```

*Логика Бэкенда:*
1.  Если статус `FAILED`, может потребоваться создание Инцидента (WarehouseIncident).
2.  Если проверка `FINAL` для ПЗ пройдена, ПЗ может быть переведено в статус `COMPLETED`.

---

## 2. Шаблоны Проверок (Templates)
*В будущем: справочник шаблонов для разных типов товаров (Техкарты ОТК).*

### 2.1 Получить шаблон для товара
**Эндпоинт:** `GET /templates/by-item/:warehouseItemId`
