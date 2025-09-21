import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('port') || 3000;

    // Запускаем бота
    const botService = app.get(BotService);
    await botService.start();

    // Обработка завершения процесса
    process.once('SIGINT', async () => {
      console.log('Получен SIGINT, завершаем работу...');
      await botService.stop();
      await app.close();
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      console.log('Получен SIGTERM, завершаем работу...');
      await botService.stop();
      await app.close();
      process.exit(0);
    });

    await app.listen(port);
    console.log(`🚀 Приложение запущено на порту ${port}`);
  } catch (error) {
    console.error('❌ Ошибка запуска приложения:', error);
    process.exit(1);
  }
}

bootstrap();
