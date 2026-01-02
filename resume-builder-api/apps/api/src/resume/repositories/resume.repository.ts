import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from '../schemas/resume.schema';

export interface CreateResumeData {
  userId: string;
  name: string;
  templateId: string;
  storageKey: string;
  sectionsIncluded: string[];
  fileSize?: number;
  mimeType?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ResumeRepository {
  constructor(
    @InjectModel(Resume.name) private readonly resumeModel: Model<ResumeDocument>,
  ) {}

  async create(data: CreateResumeData): Promise<ResumeDocument> {
    const resume = new this.resumeModel({
      userId: new Types.ObjectId(data.userId),
      name: data.name,
      templateId: data.templateId,
      storageKey: data.storageKey,
      sectionsIncluded: data.sectionsIncluded,
      fileSize: data.fileSize,
      mimeType: data.mimeType || 'application/pdf',
    });
    return resume.save();
  }

  async findById(id: string): Promise<ResumeDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.resumeModel.findById(id).exec();
  }

  async findByIdAndUserId(id: string, userId: string): Promise<ResumeDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.resumeModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    }).exec();
  }

  async findByUserId(
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<ResumeDocument>> {
    if (!Types.ObjectId.isValid(userId)) {
      return {
        items: [],
        total: 0,
        page: options.page,
        limit: options.limit,
        totalPages: 0,
      };
    }

    const userObjectId = new Types.ObjectId(userId);
    const skip = (options.page - 1) * options.limit;

    const [items, total] = await Promise.all([
      this.resumeModel
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(options.limit)
        .exec(),
      this.resumeModel.countDocuments({ userId: userObjectId }).exec(),
    ]);

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async findByStorageKey(storageKey: string): Promise<ResumeDocument | null> {
    return this.resumeModel.findOne({ storageKey }).exec();
  }

  async delete(id: string, userId: string): Promise<ResumeDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.resumeModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    }).exec();
  }

  async deleteAllByUserId(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) {
      return 0;
    }
    const result = await this.resumeModel.deleteMany({
      userId: new Types.ObjectId(userId),
    }).exec();
    return result.deletedCount;
  }

  async countByUserId(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) {
      return 0;
    }
    return this.resumeModel.countDocuments({
      userId: new Types.ObjectId(userId),
    }).exec();
  }

  async updateName(id: string, userId: string, name: string): Promise<ResumeDocument | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.resumeModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      },
      { $set: { name } },
      { new: true },
    ).exec();
  }
}
