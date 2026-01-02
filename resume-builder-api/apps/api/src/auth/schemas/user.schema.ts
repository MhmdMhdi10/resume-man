import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  _id!: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ type: String, default: null })
  refreshTokenHash?: string | null;

  @Prop({ type: String, default: null })
  passwordResetToken?: string | null;

  @Prop({ type: Date, default: null })
  passwordResetExpires?: Date | null;

  createdAt!: Date;
  updatedAt!: Date;

  // Virtual for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add index for email lookups
UserSchema.index({ email: 1 });

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static method to hash password
UserSchema.statics.hashPassword = async function (
  password: string,
): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};
