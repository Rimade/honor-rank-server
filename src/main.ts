import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = Number(
      process.env.PORT ?? configService.get<number>('port') ?? 3000,
    );
    const host = '0.0.0.0';

    // Сначала поднимаем HTTP-сервер, чтобы платформа увидела открытый порт
    await app.listen(port, host);
    console.log(`🚀 Приложение запущено на ${host}:${port}`);

    // Затем запускаем бота (не блокируем старт сервера)
    const botService = app.get(BotService);
    void botService.start();

    // Обработка завершения процесса
    process.once('SIGINT', () => {
      console.log('Получен SIGINT, завершаем работу...');
      botService.stop();
      app
        .close()
        .then(() => process.exit(0))
        .catch((err) => {
          console.error('Ошибка при закрытии приложения:', err);
          process.exit(1);
        });
    });

    process.once('SIGTERM', () => {
      console.log('Получен SIGTERM, завершаем работу...');
      botService.stop();
      app
        .close()
        .then(() => process.exit(0))
        .catch((err) => {
          console.error('Ошибка при закрытии приложения:', err);
          process.exit(1);
        });
    });

    // Порт уже слушается
  } catch (error) {
    console.error('❌ Ошибка запуска приложения:', error);
    process.exit(1);
  }
}

void bootstrap();
