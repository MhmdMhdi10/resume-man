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
exports.TemplateRegistry = void 0;
const common_1 = require("@nestjs/common");
const modern_template_1 = require("./modern.template");
const classic_template_1 = require("./classic.template");
const minimal_template_1 = require("./minimal.template");
let TemplateRegistry = class TemplateRegistry {
    constructor() {
        this.templates = new Map();
        this.templateConfigs = new Map();
        this.registerTemplate(modern_template_1.ModernTemplate);
        this.registerTemplate(classic_template_1.ClassicTemplate);
        this.registerTemplate(minimal_template_1.MinimalTemplate);
    }
    registerTemplate(TemplateClass) {
        const instance = new TemplateClass();
        const config = instance.config;
        this.templates.set(config.id, TemplateClass);
        this.templateConfigs.set(config.id, config);
    }
    getTemplate(templateId) {
        const TemplateClass = this.templates.get(templateId);
        if (!TemplateClass) {
            throw new Error(`Template not found: ${templateId}`);
        }
        return new TemplateClass();
    }
    hasTemplate(templateId) {
        return this.templates.has(templateId);
    }
    getAvailableTemplates() {
        return Array.from(this.templateConfigs.values()).map((config) => ({
            id: config.id,
            name: config.name,
            description: config.description,
            previewUrl: `/templates/${config.id}/preview.png`,
            style: config.style,
        }));
    }
    getTemplateConfig(templateId) {
        return this.templateConfigs.get(templateId);
    }
    getDefaultTemplateId() {
        return 'modern';
    }
};
exports.TemplateRegistry = TemplateRegistry;
exports.TemplateRegistry = TemplateRegistry = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TemplateRegistry);
//# sourceMappingURL=template.registry.js.map