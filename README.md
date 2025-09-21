# 🤖 Telegram Bot для системы репутации

Telegram бот для управления репутацией пользователей в чатах, построенный на NestJS и Telegraf.

## ✨ Возможности

- **➕ Увеличение репутации**: `+rep @username [причина]`
- **➖ Уменьшение репутации**: `-rep @username [причина]`
- **👤 Просмотр репутации**: `/rep @username`
- **🏆 Топ пользователей**: `/top`
- **📊 Статистика**: `/stats`
- **⏰ Система кулдаунов** для предотвращения спама
- **🔒 Защита от злоупотреблений** (один пользователь = одно изменение репутации)
- **🛡️ Валидация конфигурации** с ConfigService
- **📝 Централизованное логирование** и обработка ошибок
- **🏥 Health check** endpoint для мониторинга
- **🐳 Docker** с PostgreSQL для простого развертывания

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопируйте файл `env.example` в `.env` и заполните необходимые параметры:

```bash
cp env.example .env
```

Отредактируйте `.env`:

```env
# Токен вашего Telegram бота (получите у @BotFather)
BOT_TOKEN=your_bot_token_here

# URL базы данных PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reputation_bot?schema=public"

# Порт сервера (опционально)
PORT=3000
```

### 3. Настройка PostgreSQL

Убедитесь, что PostgreSQL установлен и запущен:

```bash
# Для Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Для macOS с Homebrew
brew install postgresql
brew services start postgresql

# Для Windows
# Скачайте и установите с https://www.postgresql.org/download/windows/
```

Создайте базу данных:

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу данных
CREATE DATABASE reputation_bot;

# Выйдите из psql
\q
```

### 4. Инициализация базы данных

```bash
# Генерация Prisma клиента
npm run db:generate

# Создание и применение миграций
npm run db:migrate

# Или для продакшена
npm run db:migrate:deploy
```

### 5. Запуск бота

```bash
# Режим разработки
npm run start:dev

# Продакшн режим
npm run build
npm run start:prod
```

## 📋 Команды бота

### Основные команды

- `/start` - Приветствие и список команд
- `/help` - Подробная справка
- `/rep @username` - Просмотр репутации пользователя
- `/top` - Топ пользователей по репутации
- `/stats` - Общая статистика бота

### Изменение репутации

- `+rep @username` - Увеличить репутацию на +1
- `+rep @username за помощь` - Увеличить с указанием причины
- `-rep @username` - Уменьшить репутацию на -1
- `-rep @username за спам` - Уменьшить с указанием причины

## 🏗️ Архитектура

```
src/
├── bot/                    # Модуль бота
│   ├── bot.service.ts     # Основная логика бота
│   └── bot.module.ts      # Модуль бота
├── reputation/             # Модуль репутации
│   ├── reputation.service.ts # Сервис работы с репутацией
│   └── reputation.module.ts  # Модуль репутации
├── prisma/                 # Работа с базой данных
│   ├── prisma.service.ts  # Prisma сервис
│   └── prisma.module.ts   # Prisma модуль
└── main.ts                # Точка входа
```

## 🗄️ База данных

Проект использует PostgreSQL с Prisma ORM. Схема включает:

- **users** - Пользователи с репутацией
- **reputations** - История изменений репутации
- **chats** - Настройки чатов
- **reputation_cooldowns** - Кулдауны между изменениями

## ⚙️ Настройки

### Кулдауны
По умолчанию между изменениями репутации установлен кулдаун в 60 минут. Это можно изменить в базе данных:

```sql
UPDATE chats SET cooldownMinutes = 30 WHERE telegramId = YOUR_CHAT_ID;
```

### Отключение репутации в чате
```sql
UPDATE chats SET reputationEnabled = false WHERE telegramId = YOUR_CHAT_ID;
```

## 🔧 Разработка

### Структура проекта

Проект следует принципам NestJS:
- **Модульная архитектура** - каждый функционал в отдельном модуле
- **Dependency Injection** - все сервисы инжектируются
- **TypeScript** - полная типизация
- **Prisma ORM** - типобезопасная работа с БД
- **ConfigService** - централизованное управление конфигурацией
- **PostgreSQL** - надежная реляционная база данных

### Добавление новых команд

1. Добавьте обработчик в `BotService.setupHandlers()`
2. Создайте метод для обработки команды
3. При необходимости добавьте новые методы в `ReputationService`

### Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Покрытие кода
npm run test:cov
```

## 🚀 Деплой

### Docker (рекомендуется)

Используйте docker-compose для запуска с PostgreSQL:

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f reputation-bot

# Остановка
docker-compose down
```

Или создайте собственный Dockerfile:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### PM2

```bash
npm install -g pm2
pm2 start dist/main.js --name "reputation-bot"
```

## 📝 Лицензия

MIT License

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

## 📞 Поддержка

Если у вас есть вопросы или проблемы, создайте Issue в репозитории.