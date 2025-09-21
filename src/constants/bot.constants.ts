export const BOT_MESSAGES = {
  WELCOME: '👋 Добро пожаловать в бота репутации!',
  HELP: '📋 Справка по командам:',
  PRIVATE_CHAT_ERROR: '❌ Эта команда работает только в группах',
  USER_NOT_FOUND: '❌ Пользователь не найден в базе данных',
  REPLY_REQUIRED: '❌ Пожалуйста, ответьте на сообщение пользователя',
  REPUTATION_CHANGED: 'Репутация изменена!',
  NO_USERS: '📊 Пока нет пользователей с репутацией',
  STATS_TITLE: '📊 Статистика бота:',
  TOP_TITLE: '🏆 Топ пользователей по репутации:',
  UNKNOWN_USER: 'Неизвестный пользователь',
} as const;

export const BOT_COMMANDS = {
  START: '/start',
  HELP: '/help',
  REP: '/rep',
  TOP: '/top',
  STATS: '/stats',
} as const;

export const REPUTATION_ACTIONS = {
  INCREASE: '+rep',
  DECREASE: '-rep',
} as const;

export const EMOJIS = {
  PLUS: '➕',
  MINUS: '➖',
  STAR: '⭐',
  MEDAL_GOLD: '🥇',
  MEDAL_SILVER: '🥈',
  MEDAL_BRONZE: '🥉',
  DOT: '🔸',
  USER: '👤',
  STATS: '📊',
  TITLE: '📋',
  WARNING: '⚠️',
  LIGHT_BULB: '💡',
  ROCKET: '🚀',
  CROSS: '❌',
  CHECK: '✅',
} as const;
