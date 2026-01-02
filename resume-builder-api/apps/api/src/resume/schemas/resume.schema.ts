import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ResumeDocument = Resume & Document;

@Schema({
  timestamps: true,
  collection: 'resumes',
})
export class Resume {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 100, trim: true })
  name!: string;

  @Prop({ required: true, type: String })
  templateId!: string;

  @Prop({ required: true, type: String })
  storageKey!: string;

  @Prop({ type: [String], default: [] })
  sectionsIncluded!: string[];

  @Prop({ type: Number })
  fileSize?: number;

  @Prop({ type: String, default: 'application/pdf' })
  mimeType!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

// Add indexes
ResumeSchema.index({ userId: 1, createdAt: -1 });
ResumeSchema.index({ storageKey: 1 }, { unique: true });
