"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const job_schema_1 = require("./schemas/job.schema");
const job_repository_1 = require("./repositories/job.repository");
const job_service_1 = require("./services/job.service");
const job_controller_1 = require("./controllers/job.controller");
const jabinja_adapter_1 = require("./adapters/jabinja.adapter");
const job_sync_worker_1 = require("./workers/job-sync.worker");
const database_1 = require("../database");
let JobModule = class JobModule {
};
exports.JobModule = JobModule;
exports.JobModule = JobModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            database_1.DatabaseModule,
            mongoose_1.MongooseModule.forFeature([
                { name: job_schema_1.Job.name, schema: job_schema_1.JobSchema },
            ]),
        ],
        controllers: [job_controller_1.JobController],
        providers: [
            job_repository_1.JobRepository,
            jabinja_adapter_1.JabinjaAdapter,
            job_sync_worker_1.JobSyncWorker,
            job_service_1.JobService,
        ],
        exports: [job_service_1.JobService, job_repository_1.JobRepository, jabinja_adapter_1.JabinjaAdapter],
    })
], JobModule);
//# sourceMappingURL=job.module.js.map