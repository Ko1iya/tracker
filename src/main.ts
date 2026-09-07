import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    // В проде фронт и API за одним origin (edge-nginx проксирует /api на бэк),
    // поэтому браузер видит same-origin и CORS не требуется. Если же задан
    // CORS_ORIGIN (напр. отдельный домен фронта) — разрешаем перечисленные origin
    // (через запятую). Иначе dev-режим: localhost + приватные подсети
    // (192.168.x.x, 10.x.x.x) на порту dev-сервера фронта, чтобы открывать
    // приложение с телефона по сетевому IP.
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):5173$/,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
