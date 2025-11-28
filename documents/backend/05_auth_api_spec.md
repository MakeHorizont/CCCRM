# Спецификация API: Аутентификация и Пользователи

## Общие сведения
Этот модуль отвечает за идентификацию сотрудников ("пропуск на завод") и управление их профилями.

**Base URL:** `/auth`
**Guards:** Все эндпоинты публичные, кроме `/auth/me` и `/auth/refresh`.

---

## 1. Вход в систему (Login)

**Эндпоинт:** `POST /login`

Рабочий предъявляет учетные данные, система выдает временный пропуск (Token).

**Request Body:**
```json
{
  "email": "romalev@fungfung.ru",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user1",
    "email": "romalev@fungfung.ru",
    "name": "Левченко Роман",
    "role": "ceo",
    "permissions": ["manage_user_hierarchy"],
    "status": "active"
  }
}
```

**Errors:**
*   `401 Unauthorized`: Неверный email или пароль.
*   `403 Forbidden`: Учетная запись заблокирована (статус `fired`).

---

## 2. Регистрация (Register)

**Эндпоинт:** `POST /register`

Создание новой учетной карточки. В первой версии регистрация открытая, в будущем — только по приглашению или с подтверждением администратора.

**Request Body:**
```json
{
  "email": "new.worker@fungfung.ru",
  "password": "securePassword123",
  "name": "Иван Новиков"
}
```

**Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_new_123",
    "email": "new.worker@fungfung.ru",
    "name": "Иван Новиков",
    "role": "employee", // По умолчанию
    "status": "active"
  }
}
```

**Errors:**
*   `409 Conflict`: Пользователь с таким email уже существует.

---

## 3. Получение текущего профиля (Me)

**Эндпоинт:** `GET /me`

Используется при загрузке приложения для проверки валидности токена и получения свежих данных о пользователе.

**Headers:**
`Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "id": "user1",
  "email": "romalev@fungfung.ru",
  "name": "Левченко Роман",
  "role": "ceo",
  "functionalRoles": ["CEO", "Главный стратег"],
  "avatarUrl": "..."
  // ... остальные поля профиля
}
```

**Errors:**
*   `401 Unauthorized`: Токен невалиден или истек.

---

## 4. Логаут (Logout)

**Эндпоинт:** `POST /logout`

Опциональный эндпоинт для инвалидации токена на сервере (blacklist), если используется Stateful JWT или сессии.

**Headers:**
`Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true
}
```