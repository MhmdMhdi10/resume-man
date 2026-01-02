import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../auth/schemas/user.schema';

export interface JobinjaCredentials {
  email: string;
  isConfigured: boolean;
}

export interface AiModelSettings {
  model: string;
  availableModels: Array<{ id: string; name: string; description: string }>;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    // Use a 32-byte key for AES-256
    const key = this.configService.get<string>('ENCRYPTION_KEY', 'default-encryption-key-change-me!');
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getJobinjaCredentials(userId: string): Promise<JobinjaCredentials> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      email: user.jobinjaEmail || '',
      isConfigured: !!(user.jobinjaEmail && user.jobinjaPasswordEncrypted),
    };
  }

  async setJobinjaCredentials(
    userId: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const encryptedPassword = this.encrypt(password);

    await this.userModel.findByIdAndUpdate(userId, {
      jobinjaEmail: email,
      jobinjaPasswordEncrypted: encryptedPassword,
    });

    this.logger.log(`Jobinja credentials updated for user ${userId}`);

    return { success: true };
  }

  async clearJobinjaCredentials(userId: string): Promise<{ success: boolean }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      jobinjaEmail: null,
      jobinjaPasswordEncrypted: null,
    });

    this.logger.log(`Jobinja credentials cleared for user ${userId}`);

    return { success: true };
  }

  async getDecryptedJobinjaPassword(userId: string): Promise<string | null> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.jobinjaPasswordEncrypted) {
      return null;
    }

    try {
      return this.decrypt(user.jobinjaPasswordEncrypted);
    } catch (error) {
      this.logger.error(`Failed to decrypt Jobinja password for user ${userId}`);
      return null;
    }
  }

  // AI Model Settings
  private readonly availableModels = [
    { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', description: 'Most capable, best for complex tasks' },
    { id: 'Qwen/Qwen3-4B-Thinking-2507', name: 'Qwen3 4B Thinking', description: 'Fast and efficient for simple tasks' },
    { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', description: 'Balanced speed and quality' },
  ];

  async getAiModelSettings(userId: string): Promise<AiModelSettings> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      model: user.preferredAiModel || 'meta-llama/Llama-3.3-70B-Instruct',
      availableModels: this.availableModels,
    };
  }

  async setAiModel(userId: string, model: string): Promise<{ success: boolean }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validModel = this.availableModels.find(m => m.id === model);
    if (!validModel) {
      throw new NotFoundException('Invalid AI model');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      preferredAiModel: model,
    });

    this.logger.log(`AI model updated to ${model} for user ${userId}`);

    return { success: true };
  }

  async getPreferredAiModel(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId).exec();
    return user?.preferredAiModel || 'meta-llama/Llama-3.3-70B-Instruct';
  }
}
