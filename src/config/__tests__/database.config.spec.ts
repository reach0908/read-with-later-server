import databaseConfig from '../database.config';

describe('databaseConfig', () => {
	it('환경변수가 설정되지 않았을 때 빈 문자열을 반환한다', () => {
		const originalEnv = process.env;
		process.env = {};
		const config = databaseConfig();
		expect(config.DATABASE_URL).toBe('');
		expect(config.DIRECT_URL).toBe('');
		process.env = originalEnv;
	});

	it('환경변수가 설정되었을 때 해당 값을 반환한다', () => {
		const originalEnv = process.env;
		const expectedDatabaseUrl = 'postgresql://user:pass@localhost:5432/db';
		const expectedDirectUrl = 'postgresql://user:pass@localhost:5432/db';
		process.env = {
			...originalEnv,
			DATABASE_URL: expectedDatabaseUrl,
			DIRECT_URL: expectedDirectUrl,
		};
		const config = databaseConfig();
		expect(config.DATABASE_URL).toBe(expectedDatabaseUrl);
		expect(config.DIRECT_URL).toBe(expectedDirectUrl);
		process.env = originalEnv;
	});
});
