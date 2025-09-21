import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Context } from 'telegraf';
import { ReputationService } from '../reputation/reputation.service';
import { BOT_MESSAGES, EMOJIS } from '../constants/bot.constants';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private bot: Telegraf;

  constructor(
    private reputationService: ReputationService,
    private configService: ConfigService,
  ) {
    const token = this.configService.getOrThrow<string>('bot.token');
    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Команда /start
    this.bot.start(async (ctx) => {
      await ctx.reply(
        `${BOT_MESSAGES.WELCOME}\n\n` +
          `${BOT_MESSAGES.HELP}\n` +
          '• +rep @username [причина] - увеличить репутацию\n' +
          '• -rep @username [причина] - уменьшить репутацию\n' +
          '• /rep @username - посмотреть репутацию пользователя\n' +
          '• /top - топ пользователей по репутации\n' +
          '• /stats - статистика бота\n' +
          '• /help - помощь\n\n' +
          `${EMOJIS.LIGHT_BULB} Репутацию можно изменить только один раз для каждого пользователя!`,
      );
    });

    // Команда /help
    this.bot.help(async (ctx) => {
      await ctx.reply(
        '📋 Справка по командам:\n\n' +
          '➕ Увеличение репутации:\n' +
          '• +rep @username\n' +
          '• +rep @username за помощь\n' +
          '• +rep @username спасибо за совет\n\n' +
          '➖ Уменьшение репутации:\n' +
          '• -rep @username\n' +
          '• -rep @username за спам\n' +
          '• -rep @username нарушение правил\n\n' +
          '📊 Просмотр информации:\n' +
          '• /rep @username - репутация пользователя\n' +
          '• /top - топ пользователей\n' +
          '• /stats - общая статистика\n\n' +
          '⚠️ Правила:\n' +
          '• Один пользователь = одно изменение репутации\n' +
          '• Есть кулдаун между изменениями\n' +
          '• Нельзя изменить репутацию самому себе',
      );
    });

    // Обработка +rep
    this.bot.hears(/^\+rep\s+@?(\w+)(?:\s+(.+))?$/i, async (ctx) => {
      await this.handleReputationChange(ctx, 1);
    });

    // Обработка -rep
    this.bot.hears(/^-rep\s+@?(\w+)(?:\s+(.+))?$/i, async (ctx) => {
      await this.handleReputationChange(ctx, -1);
    });

    // Команда /rep
    this.bot.command('rep', async (ctx) => {
      await this.handleReputationView(ctx);
    });

    // Команда /top
    this.bot.command('top', async (ctx) => {
      await this.handleTopUsers(ctx);
    });

    // Команда /stats
    this.bot.command('stats', async (ctx) => {
      await this.handleStats(ctx);
    });

    // Обработка ошибок
    this.bot.catch((err: Error, ctx) => {
      this.logger.error(`Ошибка в боте: ${err.message}`, err.stack);
      void ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    });
  }

  private async handleReputationChange(ctx: Context, value: number) {
    try {
      if (!ctx.message || !('text' in ctx.message)) return;
      const message = ctx.message;

      // Проверяем, что это не приватный чат
      if (ctx.chat?.type === 'private') {
        await ctx.reply('❌ Эта команда работает только в группах');
        return;
      }

      const match = message.text.match(
        value > 0
          ? /^\+rep\s+@?(\w+)(?:\s+(.+))?$/i
          : /^-rep\s+@?(\w+)(?:\s+(.+))?$/i,
      );

      if (!match) return;

      const reason = match[2]?.trim();

      // Получаем информацию о пользователе, которому отвечают
      let targetUserId: number;
      let targetUsername: string | undefined;
      let targetFirstName: string | undefined;
      let targetLastName: string | undefined;

      if (message.reply_to_message?.from) {
        const targetUser = message.reply_to_message.from;
        targetUserId = targetUser.id;
        targetUsername = targetUser.username;
        targetFirstName = targetUser.first_name;
        targetLastName = targetUser.last_name;
      } else {
        // Если не ответ на сообщение, пытаемся найти пользователя по username
        // В реальном боте здесь нужно использовать API Telegram для поиска пользователя
        await ctx.reply(
          '❌ Пожалуйста, ответьте на сообщение пользователя, которому хотите изменить репутацию',
        );
        return;
      }

      const giver = ctx.from;
      if (!giver || !ctx.chat) return;

      const result = await this.reputationService.changeReputation(
        giver.id,
        targetUserId,
        ctx.chat.id,
        value,
        reason,
        giver.username,
        giver.first_name,
        giver.last_name,
        targetUsername,
        targetFirstName,
        targetLastName,
      );

      const action = value > 0 ? '➕' : '➖';
      const actionText = value > 0 ? 'увеличена' : 'уменьшена';

      let response = `${action} Репутация ${actionText}!\n\n`;
      response += `👤 Пользователь: ${this.formatUserName(targetFirstName, targetLastName, targetUsername)}\n`;
      response += `⭐ Новая репутация: ${result.newReputation}\n`;
      if (reason) {
        response += `📝 Причина: ${reason}`;
      }

      await ctx.reply(response);
    } catch (error) {
      this.logger.error(
        `Ошибка при изменении репутации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
      await ctx.reply(
        `❌ ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
    }
  }

  private async handleReputationView(ctx: Context) {
    try {
      if (!ctx.message || !('text' in ctx.message)) return;
      const message = ctx.message;

      const args = message.text.split(' ').slice(1);
      if (args.length === 0) {
        await ctx.reply('❌ Укажите пользователя: /rep @username');
        return;
      }

      let targetUserId: number;
      let targetUsername: string | undefined;
      let targetFirstName: string | undefined;
      let targetLastName: string | undefined;

      if (message.reply_to_message?.from) {
        const targetUser = message.reply_to_message.from;
        targetUserId = targetUser.id;
        targetUsername = targetUser.username;
        targetFirstName = targetUser.first_name;
        targetLastName = targetUser.last_name;
      } else {
        // В реальном боте здесь нужно использовать API Telegram для поиска пользователя
        await ctx.reply('❌ Пожалуйста, ответьте на сообщение пользователя');
        return;
      }

      const userReputation =
        await this.reputationService.getUserReputation(targetUserId);

      if (!userReputation) {
        await ctx.reply('❌ Пользователь не найден в базе данных');
        return;
      }

      let response = `👤 ${this.formatUserName(targetFirstName, targetLastName, targetUsername)}\n\n`;
      response += `⭐ Репутация: ${userReputation.reputation}\n\n`;

      if (userReputation.receivedReputations.length > 0) {
        response += `📊 Последние изменения:\n`;
        userReputation.receivedReputations.forEach((rep) => {
          const giverName = this.formatUserName(
            rep.giver.firstName,
            null,
            rep.giver.username,
          );
          const action = rep.value > 0 ? '➕' : '➖';
          const reason = rep.reason ? ` (${rep.reason})` : '';
          response += `${action} ${giverName}${reason}\n`;
        });
      }

      await ctx.reply(response);
    } catch (error) {
      this.logger.error(
        `Ошибка при просмотре репутации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
      await ctx.reply(
        `❌ ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
    }
  }

  private async handleTopUsers(ctx: Context) {
    try {
      const topUsers = await this.reputationService.getTopUsers(10);

      if (topUsers.length === 0) {
        await ctx.reply('📊 Пока нет пользователей с репутацией');
        return;
      }

      let response = '🏆 Топ пользователей по репутации:\n\n';

      topUsers.forEach((user, index) => {
        const medal =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔸';
        const name = this.formatUserName(
          user.firstName,
          user.lastName,
          user.username,
        );
        response += `${medal} ${index + 1}. ${name} - ${user.reputation} ⭐\n`;
      });

      await ctx.reply(response);
    } catch (error) {
      this.logger.error(
        `Ошибка при получении топа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
      await ctx.reply(
        `❌ ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
    }
  }

  private async handleStats(ctx: Context) {
    try {
      const stats = await this.reputationService.getReputationStats();

      let response = '📊 Статистика бота:\n\n';
      response += `👥 Всего пользователей: ${stats.totalUsers}\n`;
      response += `⭐ Всего изменений репутации: ${stats.totalReputations}\n`;
      response += `➕ Положительных: ${stats.positiveReputations}\n`;
      response += `➖ Отрицательных: ${stats.negativeReputations}\n`;

      const positivePercent =
        stats.totalReputations > 0
          ? Math.round(
              (stats.positiveReputations / stats.totalReputations) * 100,
            )
          : 0;
      response += `📈 Процент положительных: ${positivePercent}%`;

      await ctx.reply(response);
    } catch (error) {
      this.logger.error(
        `Ошибка при получении статистики: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
      await ctx.reply(
        `❌ ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
    }
  }

  private formatUserName(
    firstName?: string | null,
    lastName?: string | null,
    username?: string | null,
  ): string {
    let name = '';
    if (firstName) name += firstName;
    if (lastName) name += ` ${lastName}`;
    if (username) name += ` (@${username})`;
    return name.trim() || 'Неизвестный пользователь';
  }

  async start() {
    try {
      await this.bot.launch();
      this.logger.log('Бот запущен успешно');
    } catch (error) {
      this.logger.error(
        `Ошибка запуска бота: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
      throw error;
    }
  }

  stop() {
    try {
      this.bot.stop();
      this.logger.log('Бот остановлен');
    } catch (error) {
      this.logger.error(
        `Ошибка остановки бота: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
      );
    }
  }
}
