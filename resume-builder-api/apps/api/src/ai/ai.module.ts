import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './controllers/ai.controller';
import { AiService } from './services/ai.service';
import { ProfileModule } from '../profile/profile.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [ConfigModule, ProfileModule, SettingsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
