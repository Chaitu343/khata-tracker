// apps/backend/src/uploads/uploads.controller.ts
import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, Request, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StorageService } from 'src/storage/storage.service';

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storageService: StorageService) {}

  @Post('proof')
  @UseInterceptors(FileInterceptor('file', {
    // limits: { fileSize: 1024 * 1024 * 5 }, // Example: 5MB limit
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx)$/)) {
        return callback(new HttpException('Unsupported file type', HttpStatus.BAD_REQUEST), false);
      }
      callback(null, true);
    },
  }))
  async uploadProof(
    @UploadedFile(
      new ParseFilePipe({ // Built-in validation
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          // new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf)' }), // More specific if needed
        ],
        fileIsRequired: true,
      }),
    ) file: Express.Multer.File,
    @Request() req,
  ) {
    const userId = req.user.id;
    const fileUrl = await this.storageService.uploadFile(file, userId);
    return { url: fileUrl, originalName: file.originalname, mimetype: file.mimetype };
  }
}