"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const database_1 = require("./database");
const auth_1 = require("./auth");
const profile_module_1 = require("./profile/profile.module");
const resume_module_1 = require("./resume/resume.module");
const job_module_1 = require("./job/job.module");
const auto_sender_module_1 = require("./auto-sender/auto-sender.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const notification_module_1 = require("./notification/notification.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '.env.local'],
            }),
            database_1.DatabaseModule,
            auth_1.AuthModule,
            profile_module_1.ProfileModule,
            resume_module_1.ResumeModule,
            job_module_1.JobModule,
            auto_sender_module_1.AutoSenderModule,
            dashboard_module_1.DashboardModule,
            notification_module_1.NotificationModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: auth_1.SanitizationInterceptor,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: auth_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: auth_1.RateLimitGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map