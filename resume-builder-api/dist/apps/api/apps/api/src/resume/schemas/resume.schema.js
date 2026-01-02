"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeSchema = exports.Resume = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Resume = class Resume {
};
exports.Resume = Resume;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'User', index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Resume.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 100, trim: true }),
    __metadata("design:type", String)
], Resume.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String }),
    __metadata("design:type", String)
], Resume.prototype, "templateId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String }),
    __metadata("design:type", String)
], Resume.prototype, "storageKey", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Resume.prototype, "sectionsIncluded", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], Resume.prototype, "fileSize", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: 'application/pdf' }),
    __metadata("design:type", String)
], Resume.prototype, "mimeType", void 0);
exports.Resume = Resume = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        collection: 'resumes',
    })
], Resume);
exports.ResumeSchema = mongoose_1.SchemaFactory.createForClass(Resume);
exports.ResumeSchema.index({ userId: 1, createdAt: -1 });
exports.ResumeSchema.index({ storageKey: 1 }, { unique: true });
//# sourceMappingURL=resume.schema.js.map