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
exports.VALID_STATUS_TRANSITIONS = exports.ApplicationSchema = exports.Application = void 0;
exports.isValidStatusTransition = isValidStatusTransition;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shared_1 = require("../../../../../libs/shared/src");
let Application = class Application {
};
exports.Application = Application;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Application.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Application.prototype, "jobId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Application.prototype, "resumeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Application.prototype, "batchId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: Object.values(shared_1.ApplicationStatus),
        default: shared_1.ApplicationStatus.PENDING,
        index: true,
    }),
    __metadata("design:type", String)
], Application.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Application.prototype, "retryCount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Application.prototype, "submittedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Application.prototype, "confirmationId", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Application.prototype, "errorMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Application.prototype, "coverLetter", void 0);
exports.Application = Application = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'applications' })
], Application);
exports.ApplicationSchema = mongoose_1.SchemaFactory.createForClass(Application);
exports.ApplicationSchema.index({ userId: 1, status: 1 });
exports.ApplicationSchema.index({ userId: 1, createdAt: -1 });
exports.ApplicationSchema.index({ batchId: 1, status: 1 });
exports.ApplicationSchema.index({ status: 1, createdAt: 1 });
exports.VALID_STATUS_TRANSITIONS = {
    [shared_1.ApplicationStatus.PENDING]: [shared_1.ApplicationStatus.PROCESSING, shared_1.ApplicationStatus.CANCELLED],
    [shared_1.ApplicationStatus.PROCESSING]: [shared_1.ApplicationStatus.SUBMITTED, shared_1.ApplicationStatus.FAILED, shared_1.ApplicationStatus.PENDING],
    [shared_1.ApplicationStatus.SUBMITTED]: [],
    [shared_1.ApplicationStatus.FAILED]: [shared_1.ApplicationStatus.PENDING],
    [shared_1.ApplicationStatus.CANCELLED]: [],
};
function isValidStatusTransition(currentStatus, newStatus) {
    return exports.VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
//# sourceMappingURL=application.schema.js.map