import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationPreferencesDocument = NotificationPreferences & Document;

@Schema({ timestamps: true, collection: 'notification_preferences' })
export class NotificationPreferences {
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ default: true })
  emailEnabled: boolean;

  @Prop({ default: true })
  inAppEnabled: boolean;

  @Prop({ default: true })
  applicationUpdates: boolean;

  @Prop({ default: true })
  batchSummaries: boolean;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(NotificationPreferences);

// Default preferences factory
export function createDefaultPreferences(userId: Types.ObjectId): Partial<NotificationPreferences> {
  return {
    userId,
    emailEnabled: true,
    inAppEnabled: true,
    applicationUpdates: true,
    batchSummaries: true,
  };
}
