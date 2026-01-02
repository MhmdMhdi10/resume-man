export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  LANGUAGE = 'language',
  TOOL = 'tool',
}

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
}

export enum ApplicationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUBMITTED = 'submitted',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_FAILED = 'application_failed',
  BATCH_COMPLETE = 'batch_complete',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
}
