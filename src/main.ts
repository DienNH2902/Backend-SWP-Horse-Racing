import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger/dist';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Horse Racing') // Tiêu đề hiển thị trên Swagger UI
    .setDescription('Horse Racing Backend Service API Documentation') // Mô tả chi tiết hơn về API
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // Tạo Swagger document dựa trên cấu hình và ứng dụng NestJS
  // NestJS sẽ tự động quét các controller và DTO có decorator của @nestjs/swagger
  const document = SwaggerModule.createDocument(app, config);

  // Thiết lập endpoint để phục vụ Swagger UI
  // '/api-docs' là đường dẫn bạn sẽ truy cập để xem UI (ví dụ: http://localhost:3000/api-docs)
  // Tham số thứ 2 là instance của ứng dụng NestJS
  // Tham số thứ 3 là document đã tạo ở trên
  SwaggerModule.setup('/horse-racing-swagger/index.html', app, document, {
    // Tùy chỉnh đường dẫn cho file JSON tại đây
    jsonDocumentUrl: '/swagger-json',
  });

  const configService = app.get<ConfigService>(ConfigService);
  const port = configService.get<number>('PORT') ?? 8000;
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);

  const logger = new Logger('NestApplication');

  logger.log('\x1b[33m%s\x1b[0m', 'GOLDEN HOOF APPLICATION IS STARTED');
  logger.log(
    `Application is running on: \x1b[36mhttp://localhost:${port}\x1b[0m`,
  );
  logger.log(
    `App start at: \x1b[32m\x1b[4mhttp://localhost:${port}/horse-racing-swagger/index.html\x1b[0m`,
  );
}
void bootstrap();
