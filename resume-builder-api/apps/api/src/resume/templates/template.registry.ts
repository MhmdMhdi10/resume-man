import { Injectable } from '@nestjs/common';
import { BaseTemplate, TemplateConfig } from './base.template';
import { ModernTemplate } from './modern.template';
import { ClassicTemplate } from './classic.template';
import { MinimalTemplate } from './minimal.template';
import { IResumeTemplate } from '@app/shared/interfaces/resume.interface';

type TemplateConstructor = new () => BaseTemplate;

@Injectable()
export class TemplateRegistry {
  private readonly templates: Map<string, TemplateConstructor> = new Map();
  private readonly templateConfigs: Map<string, TemplateConfig> = new Map();

  constructor() {
    this.registerTemplate(ModernTemplate);
    this.registerTemplate(ClassicTemplate);
    this.registerTemplate(MinimalTemplate);
  }

  private registerTemplate(TemplateClass: TemplateConstructor): void {
    const instance = new TemplateClass();
    const config = instance.config;
    this.templates.set(config.id, TemplateClass);
    this.templateConfigs.set(config.id, config);
  }

  getTemplate(templateId: string): BaseTemplate {
    const TemplateClass = this.templates.get(templateId);
    if (!TemplateClass) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return new TemplateClass();
  }

  hasTemplate(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  getAvailableTemplates(): IResumeTemplate[] {
    return Array.from(this.templateConfigs.values()).map((config) => ({
      id: config.id,
      name: config.name,
      description: config.description,
      previewUrl: `/templates/${config.id}/preview.png`,
      style: config.style,
    }));
  }

  getTemplateConfig(templateId: string): TemplateConfig | undefined {
    return this.templateConfigs.get(templateId);
  }

  getDefaultTemplateId(): string {
    return 'modern';
  }
}
