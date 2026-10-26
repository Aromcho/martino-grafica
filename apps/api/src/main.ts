import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import { resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: '2mb' });
  app.setGlobalPrefix('api');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: (config.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000').split(',').map((s) => s.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Archivos subidos (imágenes optimizadas WebP y videos)
  const uploads = resolve(config.get<string>('UPLOADS_DIR') ?? './uploads');
  mkdirSync(uploads, { recursive: true });
  mkdirSync(resolve(config.get<string>('PRIVATE_DIR') ?? './private'), { recursive: true });
  app.useStaticAssets(uploads, { prefix: '/uploads', maxAge: '365d', immutable: true, index: false, dotfiles: 'deny' });

  const doc = new DocumentBuilder()
    .setTitle('Martino Gráfica — API')
    .setDescription('Servicios, trabajos, historias, presupuestos y panel de administración')
    .setVersion('1.0')
    .addCookieAuth('mg_session')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  app.enableShutdownHooks();
  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port, config.get<string>('HOST') ?? '0.0.0.0');
  Logger.log(`API lista en http://localhost:${port}/api  ·  Docs: /api/docs`, 'Bootstrap');
}
bootstrap();
