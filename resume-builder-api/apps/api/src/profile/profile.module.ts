import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from './schemas/profile.schema';
import { ProfileVersion, ProfileVersionSchema } from './schemas/profile-version.schema';
import { ProfileRepository } from './repositories/profile.repository';
import { ProfileService } from './services/profile.service';
import { ProfileController } from './controllers/profile.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: ProfileVersion.name, schema: ProfileVersionSchema },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileRepository, ProfileService],
  exports: [ProfileService, ProfileRepository],
})
export class ProfileModule {}
