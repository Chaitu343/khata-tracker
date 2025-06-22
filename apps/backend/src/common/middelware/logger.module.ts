// src/logger/logger.module.ts
import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.logger'; // your config path

@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  exports: [WinstonModule], // export WinstonModule to share provider
})
export class LoggerModule {}
