
# Инструкция: Развертывание на Сервере ("Завод")

Товарищ системный администратор! Эта инструкция описывает процесс развертывания CCCRM в производственной среде. Мы используем контейнеризацию (Docker) для обеспечения надежности и переносимости.

## Требования
*   Сервер с Linux (Ubuntu/Debian/CentOS).
*   Установленный **Docker** и **Docker Compose**.
*   Доменное имя (желательно) и SSL сертификат.

## Вариант 1: Статика (Только Фронтенд)
Пока Бэкенд находится в разработке, вы можете развернуть полнофункциональную демо-версию (на моках).

1.  **Сборка образа:**
    Создайте `Dockerfile` в корне проекта:
    ```dockerfile
    # Этап сборки
    FROM node:18-alpine as build
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    # Внедряем переменные окружения на этапе сборки (если нужно)
    ARG GEMINI_API_KEY
    ENV GEMINI_API_KEY=$GEMINI_API_KEY
    RUN npm run build

    # Этап запуска (Nginx)
    FROM nginx:alpine
    COPY --from=build /app/dist /usr/share/nginx/html
    # Копируем конфиг nginx если есть особые требования (SPA routing)
    # COPY nginx.conf /etc/nginx/conf.d/default.conf
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    ```

2.  **Запуск контейнера:**
    ```bash
    docker build -t cccrm-frontend .
    docker run -d -p 80:80 --name cccrm cccrm-frontend
    ```

## Вариант 2: Fullstack (В разработке)
*Этот раздел будет обновлен после завершения этапа "Антитезис".*

Планируемая структура `docker-compose.yml`:
```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  backend:
    build: ./apps/server
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://user:${DB_PASSWORD}@db:5432/cccrm

  frontend:
    build: ./apps/client
    ports:
      - "80:80"
```

## Безопасность
*   Не храните секреты (API ключи, пароли БД) в репозитории. Используйте `.env` файлы на сервере.
*   Закройте доступ к портам БД извне (firewall).
*   Настройте регулярное резервное копирование базы данных (когда она появится).
