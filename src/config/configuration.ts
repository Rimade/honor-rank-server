import { AppConfig } from './config.interface';

export default (): AppConfig => {
  const port = parseInt(process.env.PORT || '3000', 10);
  const databaseUrl = process.env.DATABASE_URL;
  const botToken = process.env.BOT_TOKEN;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (!botToken) {
    throw new Error('BOT_TOKEN is required');
  }

  return {
    port,
    database: {
      url: databaseUrl,
    },
    bot: {
      token: botToken,
    },
  };
};
