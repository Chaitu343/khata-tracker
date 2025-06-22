// apps/backend/src/transactions/transactions.module.ts
import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerModule } from 'src/common/middelware/logger.module';

@Module({
  imports: [LoggerModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, PrismaService],
})
export class TransactionsModule {}