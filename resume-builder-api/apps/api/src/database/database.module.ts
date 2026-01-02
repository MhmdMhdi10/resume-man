import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017/resume-builder'),
        maxPoolSize: configService.get<number>('MONGODB_POOL_SIZE', 10),
        minPoolSize: configService.get<number>('MONGODB_MIN_POOL_SIZE', 2),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [MongooseModule, RedisService],
})
export class DatabaseModule {}
