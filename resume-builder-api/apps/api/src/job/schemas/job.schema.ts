import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ExperienceLevel } from '@app/shared';

export type JobDocument = Job & Document;

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ required: true, unique: true, index: true })
  jabinjaId: string;

  @Prop({ required: true, index: true })
  title: string;

  @Prop({ required: true, index: true })
  company: string;

  @Prop({ required: true, index: true })
  location: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  requirements: string[];

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ 
    type: String, 
    enum: Object.values(ExperienceLevel),
    default: ExperienceLevel.MID,
    index: true,
  })
  experienceLevel: ExperienceLevel;

  @Prop({ required: true })
  applicationUrl: string;

  @Prop({ required: true, index: true })
  postedAt: Date;

  @Prop({ required: true })
  syncedAt: Date;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Compound indexes for common queries
JobSchema.index({ location: 1, category: 1 });
JobSchema.index({ experienceLevel: 1, category: 1 });
JobSchema.index({ postedAt: -1 });
JobSchema.index({ title: 'text', company: 'text', description: 'text' });
