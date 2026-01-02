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
exports.JobSchema = exports.Job = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const shared_1 = require("../../../../../libs/shared/src");
let Job = class Job {
};
exports.Job = Job;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], Job.prototype, "jabinjaId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Job.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Job.prototype, "company", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Job.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Job.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Job.prototype, "requirements", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Job.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: Object.values(shared_1.ExperienceLevel),
        default: shared_1.ExperienceLevel.MID,
        index: true,
    }),
    __metadata("design:type", String)
], Job.prototype, "experienceLevel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Job.prototype, "applicationUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], Job.prototype, "postedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Job.prototype, "syncedAt", void 0);
exports.Job = Job = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'jobs' })
], Job);
exports.JobSchema = mongoose_1.SchemaFactory.createForClass(Job);
exports.JobSchema.index({ location: 1, category: 1 });
exports.JobSchema.index({ experienceLevel: 1, category: 1 });
exports.JobSchema.index({ postedAt: -1 });
exports.JobSchema.index({ title: 'text', company: 'text', description: 'text' });
//# sourceMappingURL=job.schema.js.map