
# Спецификация API: База Знаний (Knowledge Base Domain)

## Общие сведения
Модуль отвечает за хранение и структурирование информации. Это цифровая память коллектива.

**Base URL:** `/knowledge-base`

---

## 1. Элементы (Items: Файлы и Папки)

### 1.1 Получение списка (Содержимое папки)
**Эндпоинт:** `GET /items`

**Query Parameters:**
*   `parentId`: string (UUID родительской папки, или 'root')
*   `archived`: boolean
*   `search`: string (поиск по названию и тегам)

**Response (200 OK):**
```json
[
  {
    "id": "folder-1",
    "type": "FOLDER",
    "name": "Регламенты",
    "updatedAt": "..."
  },
  {
    "id": "file-1",
    "type": "FILE",
    "fileType": "MARKDOWN",
    "name": "Правила работы.md",
    "updatedAt": "..."
  }
]
```

### 1.2 Просмотр Файла
**Эндпоинт:** `GET /files/:id/content`

Возвращает полное содержимое файла. Проверка прав доступа (Access Rules) выполняется на сервере.

**Response:**
```json
{
  "id": "file-1",
  "content": "# Заголовок...",
  "accessRules": []
}
```

### 1.3 Создание Папки
**Эндпоинт:** `POST /folders`

**Body:**
```json
{
  "name": "Новая папка",
  "parentId": "folder-1",
  "tags": ["планирование"]
}
```

### 1.4 Создание Файла
**Эндпоинт:** `POST /files`

**Body:**
```json
{
  "name": "Заметка.md",
  "folderId": "folder-1",
  "fileType": "MARKDOWN",
  "content": "Текст..."
}
```

### 1.5 Обновление Элемента
**Эндпоинт:** `PATCH /items/:id`

Используется для переименования, перемещения (смена `parentId`) или обновления контента файла.

**Body:**
```json
{
  "name": "Новое имя",
  "content": "Обновленный текст", // Только для файлов
  "parentId": "folder-2" // Перемещение
}
```

### 1.6 Архивация/Удаление
*   `POST /items/:id/archive`
*   `DELETE /items/:id`
