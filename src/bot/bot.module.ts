import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { ReputationModule } from '../reputation/reputation.module';

@Module({
  imports: [ReputationModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
