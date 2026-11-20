import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.enableCors();

  /*
   * The engine had no validation pipe at all, so every request body reached a
   * service exactly as it arrived: unvalidated, untyped at runtime, and with
   * whatever extra properties the caller chose to send.
   *
   * whitelist strips properties no DTO declares, which matters because these
   * DTOs are passed to repositories -- an unexpected property is how a
   * caller sets a column nobody meant to expose.
   *
   * transform is what makes `page=2` an number rather than the string "2";
   * without it `"10" < "9"` is true and paging breaks at ten pages.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Scamurai Fraud Engine')
    .setDescription(
      'Ingestion, feature calculation, rule evaluation, risk scoring and ' +
        'alerting. This service is internal: the dashboard reaches it through ' +
        'the BFF, which is the layer that faces a browser.',
    )
    .setVersion('1.0')
    .addTag('Health', 'Liveness and readiness probes')
    .addTag('Ingestion', 'Pulling transactions from the upstream database')
    .addTag('Fraud Alerts', 'Working the alert queue')
    .addTag('Fraud Analysis', 'Identifier networks, risk scores and profiles')
    .addTag('Fraud Configuration', 'Rules, risk levels and policies')
    .build();

  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = process.env.PORT ?? 4000;

  await app.listen(port);

  logger.log(`Fraud engine listening on port ${port}`);
  logger.log(`API documentation at http://localhost:${port}/api/docs`);
}

void bootstrap();
