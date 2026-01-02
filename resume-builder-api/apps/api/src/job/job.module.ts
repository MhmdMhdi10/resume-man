import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Job, JobSchema } from './schemas/job.schema';
import { JobRepository } from './repositories/job.repository';
import { JobService } from './services/job.service';
import { JobController } from './controllers/job.controller';
import { JobinjaAdapter } from './adapters/jobinja.adapter';
import { JobSyncWorker } from './workers/job-sync.worker';
import { DatabaseModule } from '../database';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
    ]),
  ],
  controllers: [JobController],
  providers: [
    JobRepository,
    JobinjaAdapter,
    JobSyncWorker,
    JobService,
  ],
  exports: [JobService, JobRepository, JobinjaAdapter],
})
export class JobModule {}
