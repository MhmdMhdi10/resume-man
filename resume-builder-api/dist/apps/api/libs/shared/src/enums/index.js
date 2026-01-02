"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationChannel = exports.NotificationType = exports.ApplicationStatus = exports.ExperienceLevel = exports.ProficiencyLevel = exports.SkillCategory = void 0;
var SkillCategory;
(function (SkillCategory) {
    SkillCategory["TECHNICAL"] = "technical";
    SkillCategory["SOFT"] = "soft";
    SkillCategory["LANGUAGE"] = "language";
    SkillCategory["TOOL"] = "tool";
})(SkillCategory || (exports.SkillCategory = SkillCategory = {}));
var ProficiencyLevel;
(function (ProficiencyLevel) {
    ProficiencyLevel["BEGINNER"] = "beginner";
    ProficiencyLevel["INTERMEDIATE"] = "intermediate";
    ProficiencyLevel["ADVANCED"] = "advanced";
    ProficiencyLevel["EXPERT"] = "expert";
})(ProficiencyLevel || (exports.ProficiencyLevel = ProficiencyLevel = {}));
var ExperienceLevel;
(function (ExperienceLevel) {
    ExperienceLevel["ENTRY"] = "entry";
    ExperienceLevel["MID"] = "mid";
    ExperienceLevel["SENIOR"] = "senior";
    ExperienceLevel["LEAD"] = "lead";
})(ExperienceLevel || (exports.ExperienceLevel = ExperienceLevel = {}));
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["PENDING"] = "pending";
    ApplicationStatus["PROCESSING"] = "processing";
    ApplicationStatus["SUBMITTED"] = "submitted";
    ApplicationStatus["FAILED"] = "failed";
    ApplicationStatus["CANCELLED"] = "cancelled";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["APPLICATION_SUBMITTED"] = "application_submitted";
    NotificationType["APPLICATION_FAILED"] = "application_failed";
    NotificationType["BATCH_COMPLETE"] = "batch_complete";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["IN_APP"] = "in_app";
    NotificationChannel["EMAIL"] = "email";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
//# sourceMappingURL=index.js.map