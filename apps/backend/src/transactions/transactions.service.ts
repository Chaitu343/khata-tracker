import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto, TransactionType } from './dto/create-transaction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const { amount, type, contactId, notes, proofUrl, date } = createTransactionDto;

    // 1. Verify the contact exists and belongs to the user
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found.`);
    }
    if (contact.ownerId !== userId) {
      throw new ForbiddenException(`You do not have permission to transact with this contact.`);
    }

    // 2. Create the transaction
    return this.prisma.transaction.create({
      data: {
        amount: new Prisma.Decimal(amount), // Store as Decimal
        type,
        notes,
        proofUrl,
        date: date ? new Date(date) : new Date(), // Use provided date or current date
        userId: userId,      // The user initiating/recording this transaction
        contactId: contactId,  // The contact involved in this transaction
      },
    });
  }

  async findAll(userId: string, contactId?: string) {
    if (contactId) {
      // 1. Verify the contact exists and belongs to the user (optional, but good for security)
      const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact) {
        throw new NotFoundException(`Contact with ID ${contactId} not found.`);
      }
      if (contact.ownerId !== userId) {
        throw new ForbiddenException(`You do not have permission to view transactions for this contact.`);
      }
    }

    // 2. Fetch transactions, optionally filtered by contact, ordered by date
    const where: Prisma.TransactionWhereInput = {
      userId: userId,
    };
    
    if (contactId) {
      where.contactId = contactId;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: {
        date: 'desc', // Show most recent first
      },
      include: {
        contact: true, // Include contact details for display (e.g. in Recent Activity)
      },
    });

    // Convert Decimal amounts to numbers for JSON response
    return transactions.map(t => ({ ...t, amount: t.amount.toNumber() }));
  }

  async update(id: string, updateTransactionDto: any, userId: string) {
    // 1. Verify the transaction exists and belongs to the user
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found.`);
    }
    if (transaction.userId !== userId) {
      throw new ForbiddenException(`You do not have permission to update this transaction.`);
    }

    const { amount, type, notes, proofUrl, date } = updateTransactionDto;

    // 2. Update the transaction
    return this.prisma.transaction.update({
      where: { id },
      data: {
        amount: amount ? new Prisma.Decimal(amount) : undefined,
        type,
        notes,
        proofUrl,
        date: date ? new Date(date) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    // 1. Verify the transaction exists and belongs to the user
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found.`);
    }
    if (transaction.userId !== userId) {
      throw new ForbiddenException(`You do not have permission to delete this transaction.`);
    }

    // 2. Delete the transaction
    return this.prisma.transaction.delete({
      where: { id },
    });
  }
}