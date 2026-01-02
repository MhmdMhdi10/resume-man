import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Resume, ResumeSchema } from './schemas/resume.schema';
import { ResumeRepository } from './repositories/resume.repository';
import { StorageService } from './services/storage.service';
import { ResumeGeneratorService } from './services/resume-generator.service';
import { ResumePrettyPrinterService } from './services/resume-pretty-printer.service';
import { ResumeService } from './services/resume.service';
import { ResumeController } from './controllers/resume.controller';
import { TemplateRegistry } from './templates/template.registry';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
    ]),
    ProfileModule,
  ],
  controllers: [ResumeController],
  providers: [
    ResumeRepository,
    StorageService,
    TemplateRegistry,
    ResumeGeneratorService,
    ResumePrettyPrinterService,
    ResumeService,
  ],
  exports: [ResumeService, ResumeGeneratorService, StorageService],
})
export class ResumeModule {}
