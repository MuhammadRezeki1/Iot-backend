import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS untuk Next.js frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.100:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(3001, '0.0.0.0');

  console.log('');
  console.log('🚀 ====================================');
  console.log('🚀 NestJS Backend is running!');
  console.log('🚀 ====================================');
  console.log('📍 HTTP Server: http://localhost:3001');
  console.log('📡 MQTT Service: Initialized');
  console.log('💾 Database: Postgre connected');
  console.log('🚀 ====================================');
  console.log('');
}
bootstrap();