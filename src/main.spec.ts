import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';
import { GoogleStrategy } from './modules/auth/strategies/google.strategy';
import { PrismaService } from './database/prisma.service';

beforeAll(() => {
	process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
	process.env.GOOGLE_CLIENT_ID = 'test';
	process.env.GOOGLE_CLIENT_SECRET = 'test';
	process.env.GOOGLE_CALLBACK_URL = 'http://localhost';
});

describe('Main bootstrap (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(GoogleStrategy)
			.useValue({ validate: jest.fn() })
			.overrideProvider(PrismaService)
			.useValue({
				$connect: jest.fn(),
				onModuleInit: jest.fn(),
				user: {},
				refreshToken: {},
				// 필요한 경우 추가 mock 메서드/프로퍼티 작성
			})
			.compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('should be defined', () => {
		expect(app).toBeDefined();
	});

	// 추가적으로 CORS, Swagger, 미들웨어, 파이프 설정에 대한 mock 테스트를 작성할 수 있습니다.
});
