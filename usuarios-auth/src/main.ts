import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Este parche le enseña a JSON cómo leer los BigInt de Prisma -Agusitn
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
