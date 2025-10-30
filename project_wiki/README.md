# Инструкция по Запуску и Ведению Wiki для CCCRM с использованием Docusaurus

Товарищ, эта директория (`project_wiki/`) содержит исходные Markdown-файлы для создания полноценной документации (Wiki) по нашему проекту "Просоциалистический CRM/ERP" (CCCRM). Рекомендуемый инструмент для создания этой Wiki – **Docusaurus**.

Как ИИ-ассистент, я буду генерировать и обновлять содержимое этих `.md` файлов в структуре, подходящей для Docusaurus. Ваша задача – интегрировать их в ваш Docusaurus проект.

## Настройка Docusaurus для Wiki CCCRM:

1.  **Создайте проект Docusaurus (если еще не создан):**
    *   Откройте терминал и выполните:
        ```bash
        npx create-docusaurus@latest my-ccrm-wiki classic --typescript
        cd my-ccrm-wiki
        ```
    *   `my-ccrm-wiki` – это имя папки вашего проекта Docusaurus.
    *   `classic` – это шаблон Docusaurus.
    *   `--typescript` – флаг для использования TypeScript в конфигурационных файлах Docusaurus (рекомендуется).

2.  **Структура Документов в Docusaurus:**
    *   Docusaurus хранит документы в папке `docs/` в корне проекта.
    *   Все Markdown-файлы, которые я генерирую для `project_wiki/`, должны быть помещены в папку `docs/` вашего Docusaurus-проекта, сохраняя их структуру подпапок.
    *   **Пример:**
        *   Файл `project_wiki/index.md` (главная страница) станет `docs/intro.md` или `docs/index.md` (в зависимости от вашей конфигурации Docusaurus, часто `intro.md` используется как стартовая).
        *   Файл `project_wiki/general/project_overview.md` станет `docs/general/project_overview.md`.
        *   Файл `project_wiki/user_manual/contacts.md` станет `docs/user_manual/contacts.md`.

3.  **Настройка Боковой Панели (`sidebars.js` или `sidebars.ts`):**
    *   Docusaurus использует файл `sidebars.js` (или `sidebars.ts` при использовании TypeScript) в корне проекта для определения структуры боковой навигационной панели.
    *   Вам нужно будет создать или отредактировать этот файл.
    *   **Пример содержимого для `sidebars.ts`:**
        ```typescript
        import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

        const sidebars: SidebarsConfig = {
          // Вы можете определить один или несколько сайдбаров
          docsSidebar: [
            {
              type: 'doc',
              id: 'intro', // Ссылка на docs/intro.md (бывший project_wiki/index.md)
              label: 'Введение в CCCRM',
            },
            {
              type: 'category',
              label: 'Общая Информация',
              link: { // Делает категорию кликабельной, ведет на первую страницу
                type: 'doc',
                id: 'general/project_overview',
              },
              items: [
                'general/project_overview',   // docs/general/project_overview.md
                'general/architecture',     // docs/general/architecture.md
              ],
            },
            {
              type: 'category',
              label: 'Руководство Пользователя',
              link: {
                type: 'generated-index', // Автоматически генерируемая страница для категории
                title: 'Руководство Пользователя',
                description: 'Узнайте, как использовать различные модули CCCRM!',
                slug: '/user_manual', // URL для страницы категории
              },
              items: [
                'user_manual/getting_started',
                'user_manual/contacts',
                'user_manual/warehouse',
                'user_manual/orders',
                'user_manual/production',
                'user_manual/equipment',
                'user_manual/financials',
                'user_manual/kanban',
                'user_manual/strategy',
                'user_manual/discussions',
                'user_manual/knowledge_base',
                'user_manual/notifications',
              ],
            },
            {
              type: 'category',
              label: 'Руководство Разработчика',
              link: {type: 'doc', id: 'developer_guide/setup'},
              items: [
                'developer_guide/setup',
                'developer_guide/coding_style',
                'developer_guide/api_service',
              ],
            },
            {
              type: 'category',
              label: 'Развертывание',
              link: {type: 'doc', id: 'deployment/production_setup'},
              items: ['deployment/production_setup'],
            },
          ],
        };
        export default sidebars;
        ```

4.  **Конфигурация Docusaurus (`docusaurus.config.js` или `docusaurus.config.ts`):**
    *   Откройте файл `docusaurus.config.js` (или `.ts`) в корне вашего Docusaurus-проекта.
    *   **Настройте основные параметры:**
        ```typescript
        import {themes as prismThemes} from 'prism-react-renderer';
        import type {Config} from '@docusaurus/types';
        import type * as Preset from '@docusaurus/preset-classic';

        const config: Config = {
          title: 'CCCRM Wiki',
          tagline: 'Документация Просоциалистической CRM/ERP Системы',
          favicon: 'img/favicon.ico', // Замените на свой favicon

          url: 'https://your-ccrm-docs-url.example.com', // URL вашей будущей документации
          baseUrl: '/', // Базовый URL, обычно '/'

          // ... другие настройки ...
          
          organizationName: 'your-org', // Usually your GitHub org/user name.
          projectName: 'ccrm-wiki', // Usually your repo name.


          presets: [
            [
              'classic',
              {
                docs: {
                  sidebarPath: './sidebars.ts', // Убедитесь, что путь к файлу сайдбара верный
                  routeBasePath: '/', // Документация будет в корне сайта
                  // Можно добавить ссылку на редактирование, если хостите на GitHub/GitLab
                  // editUrl: 'https://github.com/your-repo/edit/main/docs/',
                },
                blog: false, // Отключаем блог, если не нужен
                theme: {
                  customCss: './src/css/custom.css',
                },
              } satisfies Preset.Options,
            ],
          ],

          themeConfig: {
            navbar: {
              title: 'CCCRM Wiki',
              // logo: { alt: 'CCCRM Logo', src: 'img/logo.svg', }, // Замените на свой логотип
              items: [
                {
                  type: 'docSidebar',
                  sidebarId: 'docsSidebar', // ID вашего сайдбара из sidebars.ts
                  position: 'left',
                  label: 'Документация',
                },
                // {to: '/blog', label: 'Blog', position: 'left'}, // Если нужен блог
                // { href: 'https://github.com/your-repo', label: 'GitHub', position: 'right',}, // Ссылка на репозиторий
              ],
            },
            footer: { /* ... настройки футера ... */ },
            prism: { theme: prismThemes.github, darkTheme: prismThemes.dracula }, // Темы для подсветки кода
          } satisfies Preset.ThemeConfig,
        };
        export default config;
        ```

5.  **Запуск Локально для Предпросмотра:**
    *   В терминале, находясь в папке `my-ccrm-wiki`, выполните:
        ```bash
        npm run start
        ```
        или
        ```bash
        yarn start
        ```
    *   Docusaurus запустит локальный сервер разработки (обычно `http://localhost:3000`), и вы сможете видеть вашу Wiki в браузере.

6.  **Сборка для Продакшена:**
    *   Когда документация будет готова к публикации:
        ```bash
        npm run build
        ```
        или
        ```bash
        yarn build
        ```
    *   Эта команда создаст статические HTML-файлы в папке `build/`, которые можно будет развернуть на любом хостинге статических сайтов.

## Моя Роль:

*   Я буду предоставлять вам **содержимое для Markdown-файлов** (`.md`) в нужной структуре (например, `project_wiki/general/architecture.md`).
*   Вы будете копировать это содержимое в соответствующие файлы внутри папки `docs/` вашего Docusaurus-проекта.
*   Вам нужно будет самостоятельно управлять файлами конфигурации Docusaurus (`docusaurus.config.js`, `sidebars.js`) и стилями (`src/css/custom.css`), если потребуется кастомизация.

Таким образом, мы сможем эффективно работать над созданием подробной и качественной документации для нашего CCCRM!