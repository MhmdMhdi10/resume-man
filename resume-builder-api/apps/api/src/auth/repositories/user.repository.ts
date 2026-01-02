import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../schemas/user.schema';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  refreshTokenHash?: string | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
}

@Injectable()
export class UserRepository {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: CreateUserData): Promise<UserDocument> {
    const passwordHash = await this.hashPassword(data.password);
    const user = new this.userModel({
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    return user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByPasswordResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      })
      .exec();
  }

  async update(
    id: string,
    data: UpdateUserData,
  ): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
  }

  async updatePassword(
    id: string,
    newPassword: string,
  ): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const passwordHash = await this.hashPassword(newPassword);
    return this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
          },
        },
        { new: true },
      )
      .exec();
  }

  async setRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const refreshTokenHash = refreshToken
      ? await this.hashToken(refreshToken)
      : null;
    return this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { refreshTokenHash } },
        { new: true },
      )
      .exec();
  }

  async setPasswordResetToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            passwordResetToken: token,
            passwordResetExpires: expiresAt,
          },
        },
        { new: true },
      )
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.userModel
      .countDocuments({ email: email.toLowerCase() })
      .exec();
    return count > 0;
  }

  async validatePassword(
    user: UserDocument,
    password: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async validateRefreshToken(
    user: UserDocument,
    refreshToken: string,
  ): Promise<boolean> {
    if (!user.refreshTokenHash) {
      return false;
    }
    return bcrypt.compare(refreshToken, user.refreshTokenHash);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, this.SALT_ROUNDS);
  }
}
