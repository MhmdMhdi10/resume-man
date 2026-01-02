"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoSenderModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const application_schema_1 = require("./schemas/application.schema");
const resume_schema_1 = require("../resume/schemas/resume.schema");
const profile_schema_1 = require("../profile/schemas/profile.schema");
const application_queue_service_1 = require("./services/application-queue.service");
const auto_sender_service_1 = require("./services/auto-sender.service");
const application_worker_1 = require("./workers/application.worker");
const auto_sender_controller_1 = require("./controllers/auto-sender.controller");
const database_1 = require("../database");
const job_module_1 = require("../job/job.module");
const resume_module_1 = require("../resume/resume.module");
const profile_module_1 = require("../profile/profile.module");
const notification_module_1 = require("../notification/notification.module");
let AutoSenderModule = class AutoSenderModule {
};
exports.AutoSenderModule = AutoSenderModule;
exports.AutoSenderModule = AutoSenderModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            mongoose_1.MongooseModule.forFeature([
                { name: application_schema_1.Application.name, schema: application_schema_1.ApplicationSchema },
                { name: resume_schema_1.Resume.name, schema: resume_schema_1.ResumeSchema },
                { name: profile_schema_1.Profile.name, schema: profile_schema_1.ProfileSchema },
            ]),
            database_1.DatabaseModule,
            job_module_1.JobModule,
            resume_module_1.ResumeModule,
            profile_module_1.ProfileModule,
            notification_module_1.NotificationModule,
        ],
        controllers: [auto_sender_controller_1.AutoSenderController],
        providers: [
            application_queue_service_1.ApplicationQueueService,
            auto_sender_service_1.AutoSenderService,
            application_worker_1.ApplicationWorker,
        ],
        exports: [
            application_queue_service_1.ApplicationQueueService,
            auto_sender_service_1.AutoSenderService,
            application_worker_1.ApplicationWorker,
        ],
    })
], AutoSenderModule);
//# sourceMappingURL=auto-sender.module.js.map