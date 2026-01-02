"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const config_1 = require("@nestjs/config");
const resume_schema_1 = require("./schemas/resume.schema");
const resume_repository_1 = require("./repositories/resume.repository");
const storage_service_1 = require("./services/storage.service");
const resume_generator_service_1 = require("./services/resume-generator.service");
const resume_pretty_printer_service_1 = require("./services/resume-pretty-printer.service");
const resume_service_1 = require("./services/resume.service");
const resume_controller_1 = require("./controllers/resume.controller");
const template_registry_1 = require("./templates/template.registry");
const profile_module_1 = require("../profile/profile.module");
let ResumeModule = class ResumeModule {
};
exports.ResumeModule = ResumeModule;
exports.ResumeModule = ResumeModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            mongoose_1.MongooseModule.forFeature([
                { name: resume_schema_1.Resume.name, schema: resume_schema_1.ResumeSchema },
            ]),
            profile_module_1.ProfileModule,
        ],
        controllers: [resume_controller_1.ResumeController],
        providers: [
            resume_repository_1.ResumeRepository,
            storage_service_1.StorageService,
            template_registry_1.TemplateRegistry,
            resume_generator_service_1.ResumeGeneratorService,
            resume_pretty_printer_service_1.ResumePrettyPrinterService,
            resume_service_1.ResumeService,
        ],
        exports: [resume_service_1.ResumeService, resume_generator_service_1.ResumeGeneratorService, storage_service_1.StorageService],
    })
], ResumeModule);
//# sourceMappingURL=resume.module.js.map