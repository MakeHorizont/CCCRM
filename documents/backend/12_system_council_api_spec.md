
# Спецификация API: Система и Власть (System & Governance)

## Общие сведения
Этот домен отвечает за целостность данных (Аудит) и легитимность критических изменений (Совет).
Принцип: **"Власть принадлежит коду, управляемому коллективом"**.

**Base URL:** `/system` и `/council`

---

## 1. Системный Аудит (Audit Log)
**Base URL:** `/system`

### 1.1 Журнал Событий
**Эндпоинт:** `GET /events`

**Query Parameters:**
*   `type`: SystemEventType (auth, finance, production, etc.)
*   `userId`: string
*   `dateFrom`: ISO Date
*   `dateTo`: ISO Date

**Response (200 OK):**
```json
[
  {
    "id": "evt-1",
    "timestamp": "2023-10-27T10:00:00Z",
    "userId": "user-1",
    "userName": "Роман",
    "type": "FINANCE",
    "action": "Изменение настроек Фонда",
    "details": "Ставка изменена с 15% на 20%",
    "entityId": "fund-settings"
  }
]
```

### 1.2 Запись События (Internal/System Use)
**Эндпоинт:** `POST /events`
*Этот эндпоинт обычно вызывается другими сервисами Бэкенда, но Фронтенд может писать туда клиентские события (например, вход с нового устройства).*

---

## 2. Совет (Council & Governance)
**Base URL:** `/council`

### 2.1 Список Предложений
**Эндпоинт:** `GET /proposals`

**Query:**
*   `status`: 'PENDING' | 'APPROVED' | 'REJECTED'

### 2.2 Создание Предложения
**Эндпоинт:** `POST /proposals`

**Request Body:**
```json
{
  "type": "CHANGE_FUND_SETTINGS",
  "title": "Повышение отчислений",
  "description": "Нужны деньги на новый станок",
  "payload": {
    "contributionPercentage": 20
  }
}
```

**Логика Бэкенда:**
1.  Создает запись предложения.
2.  Автоматически голосует "ЗА" от имени инициатора.
3.  Определяет необходимый кворум (например, 2/3 от группы 'MANAGERS').
4.  Рассылает уведомления членам Совета.

### 2.3 Голосование
**Эндпоинт:** `POST /proposals/:id/vote`

**Body:**
```json
{
  "decision": "APPROVE", // 'REJECT'
  "comment": "Согласен, это необходимо."
}
```

**Smart Contract Logic (на Бэкенде):**
После каждого голоса система проверяет кворум.
Если `Approves >= Required`:
1.  Статус предложения -> `APPROVED`.
2.  **Исполнение Payload:** Система *сама* меняет настройки (например, обновляет запись `CollectiveFund`).
3.  Пишет в Audit Log: "Решение Совета исполнено автоматически".

---

## 3. Системные Настройки
**Base URL:** `/system/settings`

### 3.1 Смена Режима (RPC)
**Эндпоинт:** `POST /mode`
*Требует подтверждения Совета (через механизм Proposals).*

**Body:** `{ "mode": "MOBILIZATION" | "DEVELOPMENT" }`
