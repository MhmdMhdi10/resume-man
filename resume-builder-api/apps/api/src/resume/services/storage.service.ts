import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

export interface StorageUploadResult {
  key: string;
  url: string;
  size: number;
}

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private readonly configService: ConfigService) {
    const config = this.getStorageConfig();
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;

    this.s3Client = new S3Client({
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

  private getStorageConfig(): StorageConfig {
    return {
      endpoint: this.configService.get<string>('S3_ENDPOINT', 'http://localhost:9000'),
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      bucket: this.configService.get<string>('S3_BUCKET', 'resumes'),
      accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID', 'minioadmin'),
      secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY', 'minioadmin'),
      forcePathStyle: this.configService.get<boolean>('S3_FORCE_PATH_STYLE', true),
    };
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket ${this.bucket} exists`);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'NotFound') {
        this.logger.log(`Creating bucket ${this.bucket}`);
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket ${this.bucket} created`);
      } else {
        this.logger.warn(`Could not verify bucket existence: ${error}`);
      }
    }
  }

  generateKey(userId: string, filename: string): string {
    const uuid = uuidv4();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userId}/${uuid}/${sanitizedFilename}`;
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType = 'application/pdf',
  ): Promise<StorageUploadResult> {
    const command = new PutObjectCommand({
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

  async getFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      return false;
    }
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  getFileUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }
}
