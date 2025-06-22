// apps/backend/src/contacts/contacts.service.ts
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async create(createContactDto: CreateContactDto, userId: string) {
    const { name, email, phone } = createContactDto;

    // Check for duplicates based on your unique constraints
    if (email) {
        const existingByEmail = await this.prisma.contact.findFirst({
            where: {
                ownerId: userId,
                email: email,
            },
        });
      if (existingByEmail) {
        throw new ConflictException(`Contact with email ${email} already exists.`);
      }
    }
    if (phone) {
        const existingByPhone = await this.prisma.contact.findFirst({
            where: {
                ownerId: userId,
                phone: phone,
            },
        });
      if (existingByPhone) {
          throw new ConflictException(`Contact with phone ${phone} already exists.`);
      }
    }


    return this.prisma.contact.create({
      data: {
        name,
        email,
        phone,
        ownerId: userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.contact.findMany({
      where: { ownerId: userId },
      orderBy: { name: 'asc' }, // Or createdAt, etc.
    });
  }

  async findOne(id: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    if (contact.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to access this contact');
    }
    return contact;
  }

  async update(id: string, updateContactDto: UpdateContactDto, userId: string) {
    // First, ensure the user owns this contact
    await this.findOne(id, userId); // This will throw if not found or not owned

    // Optional: Handle unique constraint conflicts on update
    if (updateContactDto.email) {
        const existingByEmail = await this.prisma.contact.findFirst({
            where: { ownerId: userId, email: updateContactDto.email, NOT: {id: id} },
        });
        if (existingByEmail) {
            throw new ConflictException(`Another contact with email ${updateContactDto.email} already exists.`);
        }
    }
    // Similar check for phone if needed

    return this.prisma.contact.update({
      where: { id }, // No need for ownerId here as findOne already checked ownership
      data: updateContactDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Ensure ownership and existence
    return this.prisma.contact.delete({
      where: { id },
    });
  }
}