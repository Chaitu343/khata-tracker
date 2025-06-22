// apps/backend/src/storage/storage.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs-extra'; // For local storage: pnpm --filter backend add fs-extra @types/fs-extra
import * as path from 'path';
import { ConfigService } from '@nestjs/config'; // If using @nestjs/config for URLs

// --- For AWS S3 (Example - you'd install aws-sdk) ---
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  // --- For AWS S3 ---
  // private s3Client: S3Client;
  // private bucketName: string;
  // private baseUrl: string;

  constructor(private configService: ConfigService) {
    // --- For Local Storage ---
    // Ensure upload directory exists
    const uploadPath = path.join(__dirname, '..', '..', 'uploads');

    // --- For AWS S3 ---
    // this.s3Client = new S3Client({
    //   region: this.configService.get('AWS_S3_REGION'),
    //   credentials: {
    //     accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
    //     secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    //   },
    // });
    // this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
    // this.baseUrl = `https://${this.bucketName}.s3.${this.configService.get('AWS_S3_REGION')}.amazonaws.com`;
  }

  async uploadFile(file: Express.Multer.File, userId: string): Promise<string> {
    // ** STRATEGY 1: Local Storage (for development) **
    const filename = `${userId}-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const uploadPath = path.join(__dirname, '..', '..', 'fileUploads'); // Adjust as per your project structure
    const filePath = path.join(uploadPath, filename);

    try {
      await fs.writeFile(filePath, file.buffer);
      this.logger.log(`File saved locally: ${filePath}`);
      // IMPORTANT: This URL is only accessible if your NestJS app serves static files from this 'uploads' directory
      // And it's only for local development.
      const serverBaseUrl = this.configService.get<string>('SERVER_BASE_URL') || `http://localhost:${this.configService.get<string>('PORT') || 3001}`;
      return `${serverBaseUrl}/uploads/${filename}`; // Example URL
    } catch (error) {
      this.logger.error('Failed to save file locally', error.stack);
      throw new InternalServerErrorException('Failed to upload file.');
    }

    // ** STRATEGY 2: AWS S3 (Example - implement one strategy) **
    // const fileKey = `proofs/${userId}/${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;
    // try {
    //   await this.s3Client.send(new PutObjectCommand({
    //     Bucket: this.bucketName,
    //     Key: fileKey,
    //     Body: file.buffer,
    //     ContentType: file.mimetype,
    //     // ACL: 'public-read', // If you want files to be publicly readable
    //   }));
    //   this.logger.log(`File uploaded to S3: ${fileKey}`);
    //   return `${this.baseUrl}/${fileKey}`; // Or use a CloudFront URL
    // } catch (error) {
    //   this.logger.error('Failed to upload file to S3', error.stack);
    //   throw new InternalServerErrorException('Failed to upload file.');
    // }
  }
}