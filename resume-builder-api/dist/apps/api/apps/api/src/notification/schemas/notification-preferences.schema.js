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
exports.NotificationPreferencesSchema = exports.NotificationPreferences = void 0;
exports.createDefaultPreferences = createDefaultPreferences;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let NotificationPreferences = class NotificationPreferences {
};
exports.NotificationPreferences = NotificationPreferences;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, required: true, unique: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], NotificationPreferences.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], NotificationPreferences.prototype, "emailEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], NotificationPreferences.prototype, "inAppEnabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], NotificationPreferences.prototype, "applicationUpdates", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], NotificationPreferences.prototype, "batchSummaries", void 0);
exports.NotificationPreferences = NotificationPreferences = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'notification_preferences' })
], NotificationPreferences);
exports.NotificationPreferencesSchema = mongoose_1.SchemaFactory.createForClass(NotificationPreferences);
function createDefaultPreferences(userId) {
    return {
        userId,
        emailEnabled: true,
        inAppEnabled: true,
        applicationUpdates: true,
        batchSummaries: true,
    };
}
//# sourceMappingURL=notification-preferences.schema.js.map