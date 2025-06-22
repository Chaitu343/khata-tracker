// apps/backend/src/transactions/transactions.service.ts
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

  async findAllByContact(contactId: string, userId: string) {
    // 1. Verify the contact exists and belongs to the user (optional, but good for security)
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found.`);
    }
    if (contact.ownerId !== userId) {
      throw new ForbiddenException(`You do not have permission to view transactions for this contact.`);
    }

    // 2. Fetch transactions for that contact, ordered by date
    const transactions = await this.prisma.transaction.findMany({
      where: {
        contactId: contactId,
        userId: userId, // Ensure user only sees their transactions with this contact
      },
      orderBy: {
        date: 'desc', // Show most recent first
      },
    });

    // Convert Decimal amounts to numbers for JSON response
    return transactions.map(t => ({ ...t, amount: t.amount.toNumber() }));
  }

  // TODO: Implement findOne, update, remove for transactions later if needed
  // For 'remove', consider recalculating contact's netBalance or having a "soft delete"
}