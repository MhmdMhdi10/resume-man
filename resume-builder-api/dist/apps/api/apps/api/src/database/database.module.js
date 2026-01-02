"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("./redis.service");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    uri: configService.get('MONGODB_URI', 'mongodb://localhost:27017/resume-builder'),
                    maxPoolSize: configService.get('MONGODB_POOL_SIZE', 10),
                    minPoolSize: configService.get('MONGODB_MIN_POOL_SIZE', 2),
                    serverSelectionTimeoutMS: 5000,
                    socketTimeoutMS: 45000,
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [redis_service_1.RedisService],
        exports: [mongoose_1.MongooseModule, redis_service_1.RedisService],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map