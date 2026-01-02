"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const profile_schema_1 = require("./schemas/profile.schema");
const profile_version_schema_1 = require("./schemas/profile-version.schema");
const profile_repository_1 = require("./repositories/profile.repository");
const profile_service_1 = require("./services/profile.service");
const profile_controller_1 = require("./controllers/profile.controller");
let ProfileModule = class ProfileModule {
};
exports.ProfileModule = ProfileModule;
exports.ProfileModule = ProfileModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: profile_schema_1.Profile.name, schema: profile_schema_1.ProfileSchema },
                { name: profile_version_schema_1.ProfileVersion.name, schema: profile_version_schema_1.ProfileVersionSchema },
            ]),
        ],
        controllers: [profile_controller_1.ProfileController],
        providers: [profile_repository_1.ProfileRepository, profile_service_1.ProfileService],
        exports: [profile_service_1.ProfileService, profile_repository_1.ProfileRepository],
    })
], ProfileModule);
//# sourceMappingURL=profile.module.js.map