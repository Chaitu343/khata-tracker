// apps/backend/src/contacts/contacts.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  UseInterceptors,
  HttpException,
  HttpStatus,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { log } from 'console';

@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(
    @Body(ValidationPipe) createContactDto: CreateContactDto,
    @Request() req,
  ) {
    const userId = req.user.id; // Extracted from JWT payload by JwtAuthGuard/JwtStrategy
    return this.contactsService.create(createContactDto, userId);
  }

  @Get()
  findAll(@Request() req) {
    const userId = req.user.id;
    return this.contactsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    console.log('id', id);
    // Use ParseUUIDPipe if your IDs are UUIDs (cuid is fine)
    const userId = req.user.id;
    return this.contactsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateContactDto: UpdateContactDto,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.contactsService.update(id, updateContactDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user.id;
    return this.contactsService.remove(id, userId);
  }

  @Delete('all/my-contacts') // Using a more specific path to avoid accidental calls
  async removeAllUserContacts(@Request() req) {
    const userId = req.user.id;
    return this.contactsService.removeAllForUser(userId);
  }

  @Post('import/csv')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (
          !file.originalname.match(/\.(csv)$/) ||
          file.mimetype !== 'text/csv'
        ) {
          return callback(
            new HttpException(
              'Only CSV files are allowed!',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async importContactsFromCsv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB limit for CSV
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.contactsService.importFromCsv(
      file.buffer.toString('utf-8'),
      userId,
    );
  }
}
