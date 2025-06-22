// apps/backend/src/transactions/transactions.controller.ts
import { Controller, Get, Post, Body, UseGuards, Request, ValidationPipe, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body(ValidationPipe) createTransactionDto: CreateTransactionDto, @Request() req) {
    const userId = req.user.id;
    return this.transactionsService.create(createTransactionDto, userId);
  }

  // Get all transactions for a specific contact
  @Get()
    findAllByContact(
    @Query('contactId') contactId: string,
    @Request() req
  ) {
    // We use @Query('contactId') to get it from query params like /transactions?contactId=xxx
    // Alternatively, you could do /contacts/:contactId/transactions if you prefer nested routes
    console.log('contactId', contactId);
    const userId = req.user.id;
    return this.transactionsService.findAllByContact(contactId, userId);
  }

  // Add GET /transactions/:id, PATCH /transactions/:id, DELETE /transactions/:id later
}