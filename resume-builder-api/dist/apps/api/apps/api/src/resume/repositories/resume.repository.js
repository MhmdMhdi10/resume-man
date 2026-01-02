"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const resume_schema_1 = require("../schemas/resume.schema");
let ResumeRepository = class ResumeRepository {
    constructor(resumeModel) {
        this.resumeModel = resumeModel;
    }
    async create(data) {
        const resume = new this.resumeModel({
            userId: new mongoose_2.Types.ObjectId(data.userId),
            name: data.name,
            templateId: data.templateId,
            storageKey: data.storageKey,
            sectionsIncluded: data.sectionsIncluded,
            fileSize: data.fileSize,
            mimeType: data.mimeType || 'application/pdf',
        });
        return resume.save();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            return null;
        }
        return this.resumeModel.findById(id).exec();
    }
    async findByIdAndUserId(id, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(id) || !mongoose_2.Types.ObjectId.isValid(userId)) {
            return null;
        }
        return this.resumeModel.findOne({
            _id: new mongoose_2.Types.ObjectId(id),
            userId: new mongoose_2.Types.ObjectId(userId),
        }).exec();
    }
    async findByUserId(userId, options) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            return {
                items: [],
                total: 0,
                page: options.page,
                limit: options.limit,
                totalPages: 0,
            };
        }
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
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
    async findByStorageKey(storageKey) {
        return this.resumeModel.findOne({ storageKey }).exec();
    }
    async delete(id, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(id) || !mongoose_2.Types.ObjectId.isValid(userId)) {
            return null;
        }
        return this.resumeModel.findOneAndDelete({
            _id: new mongoose_2.Types.ObjectId(id),
            userId: new mongoose_2.Types.ObjectId(userId),
        }).exec();
    }
    async deleteAllByUserId(userId) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            return 0;
        }
        const result = await this.resumeModel.deleteMany({
            userId: new mongoose_2.Types.ObjectId(userId),
        }).exec();
        return result.deletedCount;
    }
    async countByUserId(userId) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            return 0;
        }
        return this.resumeModel.countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
        }).exec();
    }
    async updateName(id, userId, name) {
        if (!mongoose_2.Types.ObjectId.isValid(id) || !mongoose_2.Types.ObjectId.isValid(userId)) {
            return null;
        }
        return this.resumeModel.findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(id),
            userId: new mongoose_2.Types.ObjectId(userId),
        }, { $set: { name } }, { new: true }).exec();
    }
};
exports.ResumeRepository = ResumeRepository;
exports.ResumeRepository = ResumeRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(resume_schema_1.Resume.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ResumeRepository);
//# sourceMappingURL=resume.repository.js.map