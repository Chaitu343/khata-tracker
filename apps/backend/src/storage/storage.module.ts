// apps/backend/src/storage/storage.module.ts
import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule

@Global() // Make StorageService available globally if desired
@Module({
  imports: [ConfigModule], // Make ConfigService available
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}