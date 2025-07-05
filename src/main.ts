import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { LoggingInterceptor } from 'src/common/interceptors/logging.interceptor';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
	// 로그 레벨 설정 (단일 값)
	const logLevel = (process.env.LOG_LEVEL || 'log') as 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';
	const app = await NestFactory.create(AppModule, {
		logger: [logLevel],
	});

	// Helmet 보안 미들웨어 추가
	app.use(helmet());

	// CORS 설정
	app.enableCors({
		origin: process.env.CLIENT_URL || 'http://localhost:3000',
		credentials: true, // 쿠키를 포함한 요청 허용
	});

	// Cookie parser 미들웨어 추가
	app.use(cookieParser());

	// LoggingInterceptor 추가
	app.useGlobalInterceptors(new LoggingInterceptor());

	// ValidationPipe 추가
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // DTO에 정의되지 않은 값은 거부
			forbidNonWhitelisted: true, // 정의되지 않은 값이 오면 에러
			transform: true, // payload를 DTO 인스턴스로 변환
		}),
	);

	// Swagger 문서 개발환경에서만 활성화
	if (process.env.NODE_ENV !== 'production') {
		const config = new DocumentBuilder()
			.setTitle('Read with later')
			.setDescription('Read with later API')
			.setVersion('1.0')
			.addBearerAuth(
				{
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
					description: 'Enter JWT token (without "Bearer" prefix)',
					name: 'Authorization',
					in: 'header',
				},
				'access-token',
			)
			.addSecurityRequirements('access-token')
			.build();

		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api', app, document, {
			swaggerOptions: {
				persistAuthorization: true, // 브라우저 새로고침 시에도 토큰 유지
			},
		});
	}

	const logger = new Logger('Bootstrap');
	logger.log(`Application starting with log level: ${logLevel}`);

	await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
