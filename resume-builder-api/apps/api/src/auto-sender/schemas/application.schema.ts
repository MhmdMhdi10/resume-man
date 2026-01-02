import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApplicationStatus } from '@app/shared';

export type ApplicationDocument = Application & Document;

@Schema({ timestamps: true, collection: 'applications' })
export class Application {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  resumeId: Types.ObjectId;

  @Prop({ required: true, index: true })
  batchId: string;

  @Prop({
    type: String,
    enum: Object.values(ApplicationStatus),
    default: ApplicationStatus.PENDING,
    index: true,
  })
  status: ApplicationStatus;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  submittedAt?: Date;

  @Prop()
  confirmationId?: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  coverLetter?: string;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

// Compound indexes for common queries
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ userId: 1, createdAt: -1 });
ApplicationSchema.index({ batchId: 1, status: 1 });
ApplicationSchema.index({ status: 1, createdAt: 1 });

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.PENDING]: [ApplicationStatus.PROCESSING, ApplicationStatus.CANCELLED],
  [ApplicationStatus.PROCESSING]: [ApplicationStatus.SUBMITTED, ApplicationStatus.FAILED, ApplicationStatus.PENDING],
  [ApplicationStatus.SUBMITTED]: [], // Terminal state
  [ApplicationStatus.FAILED]: [ApplicationStatus.PENDING], // Can retry
  [ApplicationStatus.CANCELLED]: [], // Terminal state
};

export function isValidStatusTransition(
  currentStatus: ApplicationStatus,
  newStatus: ApplicationStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
