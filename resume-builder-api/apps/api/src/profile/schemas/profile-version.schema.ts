import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProfileVersionDocument = ProfileVersion & Document;

// Schema to store profile version history
@Schema({
  timestamps: true,
  collection: 'profile_versions',
})
export class ProfileVersion {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Profile', index: true })
  profileId!: Types.ObjectId;

  @Prop({ required: true, type: Number })
  version!: number;

  @Prop({ required: true, type: Object })
  snapshot!: Record<string, unknown>;

  @Prop({ type: String, maxlength: 500 })
  changeDescription?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ProfileVersionSchema = SchemaFactory.createForClass(ProfileVersion);

// Add compound index for efficient version lookups
ProfileVersionSchema.index({ profileId: 1, version: -1 });
ProfileVersionSchema.index({ profileId: 1, createdAt: -1 });
