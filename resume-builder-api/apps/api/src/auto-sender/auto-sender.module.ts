import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { Resume, ResumeSchema } from '../resume/schemas/resume.schema';
import { Profile, ProfileSchema } from '../profile/schemas/profile.schema';
import { ApplicationQueueService } from './services/application-queue.service';
import { AutoSenderService } from './services/auto-sender.service';
import { ApplicationWorker } from './workers/application.worker';
import { AutoSenderController } from './controllers/auto-sender.controller';
import { DatabaseModule } from '../database';
import { JobModule } from '../job/job.module';
import { ResumeModule } from '../resume/resume.module';
import { ProfileModule } from '../profile/profile.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
    DatabaseModule,
    JobModule,
    ResumeModule,
    ProfileModule,
    NotificationModule,
  ],
  controllers: [AutoSenderController],
  providers: [
    ApplicationQueueService,
    AutoSenderService,
    ApplicationWorker,
  ],
  exports: [
    ApplicationQueueService,
    AutoSenderService,
    ApplicationWorker,
  ],
})
export class AutoSenderModule {}
