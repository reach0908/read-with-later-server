import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// CORS 설정
	app.enableCors({
		origin: process.env.CLIENT_URL || 'http://localhost:3000',
		credentials: true, // 쿠키를 포함한 요청 허용
	});

	// Cookie parser 미들웨어 추가
	app.use(cookieParser());

	await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
