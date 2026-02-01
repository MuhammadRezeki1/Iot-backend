import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔥 FIX: Aktifkan CORS supaya Next.js bisa fetch
  app.enableCors({
    origin: 'http://localhost:3000', // Next.js port
    methods: ['GET', 'POST'],
  });

  // 🔥 FIX: Listen ke semua interface IPv4, jangan biarkan default (::1)
  await app.listen(3001, '0.0.0.0');

  console.log('🚀 NestJS Backend running on http://localhost:3001');
}
bootstrap();
