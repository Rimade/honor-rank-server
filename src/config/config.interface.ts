export interface DatabaseConfig {
  url: string;
}

export interface BotConfig {
  token: string;
}

export interface AppConfig {
  port: number;
  database: DatabaseConfig;
  bot: BotConfig;
}
