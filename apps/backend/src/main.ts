// apps/backend/src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { winstonConfig } from './common/middelware/winston.logger';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

   console.log(`[CORS] Allowing origin: ${process.env.FRONTEND_URL}`);
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe (you had this before, it's good to keep)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

    // Serve files from the 'uploads' directory at the project root
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/', // Files accessible via http://localhost:3001/uploads/filename.ext
  });

  const port = process.env.PORT || 3001; 
  await app.listen(port);
  console.log(`✅ Backend application is running on: http://localhost:${port}`);
}
bootstrap();