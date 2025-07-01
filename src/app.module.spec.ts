import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { GoogleStrategy } from './modules/auth/strategies/google.strategy';

beforeAll(() => {
	process.env.GOOGLE_CLIENT_ID = 'test';
	process.env.GOOGLE_CLIENT_SECRET = 'test';
	process.env.GOOGLE_CALLBACK_URL = 'http://localhost';
});

describe('AppModule', () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [AppModule],
			providers: [
				{
					provide: GoogleStrategy,
					useValue: { validate: jest.fn() },
				},
			],
		}).compile();
	});

	it('should compile the module', () => {
		expect(module).toBeDefined();
	});
});
