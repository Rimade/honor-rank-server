import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReputationChangeResult {
  success: boolean;
  message: string;
  newReputation: number;
}

@Injectable()
export class ReputationService {
  constructor(private prisma: PrismaService) {}

  async getUserOrCreate(
    telegramId: number,
    username?: string,
    firstName?: string,
    lastName?: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(telegramId),
          username,
          firstName,
          lastName,
        },
      });
    } else {
      // Обновляем данные пользователя если они изменились
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          firstName,
          lastName,
        },
      });
    }

    return user;
  }

  async getChatOrCreate(telegramId: number, title?: string, type?: string) {
    let chat = await this.prisma.chat.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          telegramId: BigInt(telegramId),
          title,
          type,
        },
      });
    }

    return chat;
  }

  async canChangeReputation(giverId: number, chatId: number): Promise<boolean> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat || !chat.reputationEnabled) {
      return false;
    }

    const cooldown = await this.prisma.reputationCooldown.findUnique({
      where: {
        giverId_chatId: {
          giverId,
          chatId: chat.id,
        },
      },
    });

    if (!cooldown) {
      return true;
    }

    const now = new Date();
    const cooldownEnd = new Date(
      cooldown.lastUsed.getTime() + chat.cooldownMinutes * 60 * 1000,
    );

    return now >= cooldownEnd;
  }

  async changeReputation(
    giverTelegramId: number,
    receiverTelegramId: number,
    chatTelegramId: number,
    value: number,
    reason?: string,
    giverUsername?: string,
    giverFirstName?: string,
    giverLastName?: string,
    receiverUsername?: string,
    receiverFirstName?: string,
    receiverLastName?: string,
  ): Promise<ReputationChangeResult> {
    // Проверяем, что пользователь не пытается изменить репутацию самому себе
    if (giverTelegramId === receiverTelegramId) {
      throw new BadRequestException('Нельзя изменить репутацию самому себе');
    }

    // Получаем или создаем пользователей
    const giver = await this.getUserOrCreate(
      giverTelegramId,
      giverUsername,
      giverFirstName,
      giverLastName,
    );

    const receiver = await this.getUserOrCreate(
      receiverTelegramId,
      receiverUsername,
      receiverFirstName,
      receiverLastName,
    );

    // Получаем или создаем чат
    const chat = await this.getChatOrCreate(chatTelegramId);

    // Проверяем кулдаун
    if (!(await this.canChangeReputation(giver.id, chat.id))) {
      const cooldown = await this.prisma.reputationCooldown.findUnique({
        where: {
          giverId_chatId: {
            giverId: giver.id,
            chatId: chat.id,
          },
        },
      });

      let remainingMinutes = 0;
      if (cooldown) {
        remainingMinutes = Math.ceil(
          (cooldown.lastUsed.getTime() +
            chat.cooldownMinutes * 60 * 1000 -
            Date.now()) /
            (60 * 1000),
        );
      }

      throw new ForbiddenException(
        `Подождите ${remainingMinutes} минут перед следующим изменением репутации`,
      );
    }

    // Проверяем, не давал ли уже репутацию этому пользователю
    const existingReputation = await this.prisma.reputation.findUnique({
      where: {
        giverId_receiverId: {
          giverId: giver.id,
          receiverId: receiver.id,
        },
      },
    });

    if (existingReputation) {
      throw new BadRequestException(
        'Вы уже изменили репутацию этому пользователю',
      );
    }

    // Создаем запись о репутации
    await this.prisma.reputation.create({
      data: {
        giverId: giver.id,
        receiverId: receiver.id,
        value,
        reason,
      },
    });

    // Обновляем репутацию получателя
    const updatedReceiver = await this.prisma.user.update({
      where: { id: receiver.id },
      data: {
        reputation: {
          increment: value,
        },
      },
    });

    // Обновляем кулдаун
    await this.prisma.reputationCooldown.upsert({
      where: {
        giverId_chatId: {
          giverId: giver.id,
          chatId: chat.id,
        },
      },
      update: {
        lastUsed: new Date(),
      },
      create: {
        giverId: giver.id,
        chatId: chat.id,
      },
    });

    const action = value > 0 ? 'увеличена' : 'уменьшена';
    const message = `Репутация ${action} на ${Math.abs(value)}. Текущая репутация: ${updatedReceiver.reputation}`;

    return {
      success: true,
      message,
      newReputation: updatedReceiver.reputation,
    };
  }

  async getTopUsers(limit: number = 10) {
    return await this.prisma.user.findMany({
      orderBy: { reputation: 'desc' },
      take: limit,
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        reputation: true,
      },
    });
  }

  async getUserReputation(telegramId: number) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        reputation: true,
        receivedReputations: {
          select: {
            value: true,
            reason: true,
            createdAt: true,
            giver: {
              select: {
                username: true,
                firstName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return user;
  }

  async getReputationStats() {
    const totalUsers = await this.prisma.user.count();
    const totalReputations = await this.prisma.reputation.count();
    const positiveReputations = await this.prisma.reputation.count({
      where: { value: { gt: 0 } },
    });
    const negativeReputations = await this.prisma.reputation.count({
      where: { value: { lt: 0 } },
    });

    return {
      totalUsers,
      totalReputations,
      positiveReputations,
      negativeReputations,
    };
  }
}
