import appConfig from '../app.config';

describe('appConfig', () => {
	it('환경변수가 설정되지 않았을 때 기본값을 반환한다', () => {
		const originalEnv = process.env;
		process.env = {};
		const config = appConfig();
		expect(config.BASE_URL).toContain('localhost');
		expect(config.CLIENT_URL).toContain('localhost');
		process.env = originalEnv;
	});

	it('환경변수가 설정되었을 때 해당 값을 반환한다', () => {
		const originalEnv = process.env;
		const expectedBaseUrl = 'https://api.example.com';
		const expectedClientUrl = 'https://app.example.com';
		process.env = {
			...originalEnv,
			BASE_URL: expectedBaseUrl,
			CLIENT_URL: expectedClientUrl,
		};
		const config = appConfig();
		expect(config.BASE_URL).toBe(expectedBaseUrl);
		expect(config.CLIENT_URL).toBe(expectedClientUrl);
		process.env = originalEnv;
	});
});
