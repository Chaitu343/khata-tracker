import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
// StorageModule should be Global or imported here if StorageService is used
// import { StorageModule } from '../storage/storage.module';

@Module({
  // imports: [StorageModule],
  controllers: [UploadsController],
})
export class UploadsModule {}