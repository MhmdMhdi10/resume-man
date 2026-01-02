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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
let StorageService = StorageService_1 = class StorageService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StorageService_1.name);
        const config = this.getStorageConfig();
        this.bucket = config.bucket;
        this.endpoint = config.endpoint;
        this.s3Client = new client_s3_1.S3Client({
            endpoint: config.endpoint,
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            forcePathStyle: config.forcePathStyle,
        });
    }
    async onModuleInit() {
        await this.ensureBucketExists();
    }
    getStorageConfig() {
        return {
            endpoint: this.configService.get('S3_ENDPOINT', 'http://localhost:9000'),
            region: this.configService.get('S3_REGION', 'us-east-1'),
            bucket: this.configService.get('S3_BUCKET', 'resumes'),
            accessKeyId: this.configService.get('S3_ACCESS_KEY_ID', 'minioadmin'),
            secretAccessKey: this.configService.get('S3_SECRET_ACCESS_KEY', 'minioadmin'),
            forcePathStyle: this.configService.get('S3_FORCE_PATH_STYLE', true),
        };
    }
    async ensureBucketExists() {
        try {
            await this.s3Client.send(new client_s3_1.HeadBucketCommand({ Bucket: this.bucket }));
            this.logger.log(`Bucket ${this.bucket} exists`);
        }
        catch (error) {
            if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFound') {
                this.logger.log(`Creating bucket ${this.bucket}`);
                await this.s3Client.send(new client_s3_1.CreateBucketCommand({ Bucket: this.bucket }));
                this.logger.log(`Bucket ${this.bucket} created`);
            }
            else {
                this.logger.warn(`Could not verify bucket existence: ${error}`);
            }
        }
    }
    generateKey(userId, filename) {
        const uuid = (0, uuid_1.v4)();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${userId}/${uuid}/${sanitizedFilename}`;
    }
    async uploadFile(buffer, key, contentType = 'application/pdf') {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });
        await this.s3Client.send(command);
        return {
            key,
            url: this.getFileUrl(key),
            size: buffer.length,
        };
    }
    async getFile(key) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        const response = await this.s3Client.send(command);
        if (!response.Body) {
            throw new Error(`File not found: ${key}`);
        }
        const stream = response.Body;
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }
    async deleteFile(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to delete file ${key}:`, error);
            return false;
        }
    }
    async fileExists(key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.s3Client.send(command);
            return true;
        }
        catch {
            return false;
        }
    }
    getFileUrl(key) {
        return `${this.endpoint}/${this.bucket}/${key}`;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map