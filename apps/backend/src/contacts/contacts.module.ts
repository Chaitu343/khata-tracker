// apps/backend/src/contacts/contacts.module.ts
import { Module } from '@nestjs/common';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoggerModule } from 'src/common/middelware/logger.module';

@Module({
  imports: [LoggerModule],
  controllers: [ContactsController],
  providers: [ContactsService, PrismaService],
})
export class ContactsModule {}