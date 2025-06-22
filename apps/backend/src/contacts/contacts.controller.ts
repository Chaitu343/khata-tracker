// apps/backend/src/contacts/contacts.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ValidationPipe, ParseUUIDPipe } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactsService } from './contacts.service';

@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  create(@Body(ValidationPipe) createContactDto: CreateContactDto, @Request() req) {
    const userId = req.user.id; // Extracted from JWT payload by JwtAuthGuard/JwtStrategy
    return this.contactsService.create(createContactDto, userId);
  }

  @Get()
  findAll(@Request() req) {
    const userId = req.user.id;
    return this.contactsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) { // Use ParseUUIDPipe if your IDs are UUIDs (cuid is fine)
    const userId = req.user.id;
    return this.contactsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateContactDto: UpdateContactDto,
    @Request() req
  ) {
    const userId = req.user.id;
    return this.contactsService.update(id, updateContactDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    const userId = req.user.id;
    return this.contactsService.remove(id, userId);
  }
}