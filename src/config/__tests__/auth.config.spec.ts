import authConfig from '../auth.config';

describe('authConfig', () => {
	it('환경변수가 설정되지 않았을 때 기본 JWT 값을 반환한다', () => {
		const originalEnv = process.env;
		process.env = {};
		const config = authConfig();
		expect(config.JWT_SECRET).toBeDefined();
		expect(config.JWT_REFRESH_EXPIRES_IN).toBe('7d');
		expect(config.JWT_ACCESS_EXPIRES_IN).toBe('15m');
		process.env = originalEnv;
	});

	it('환경변수가 설정되었을 때 해당 값을 반환한다', () => {
		const originalEnv = process.env;
		const expectedSecret = 'custom-secret';
		const expectedRefreshExpires = '30d';
		const expectedAccessExpires = '1h';
		process.env = {
			...originalEnv,
			JWT_SECRET: expectedSecret,
			JWT_REFRESH_EXPIRES_IN: expectedRefreshExpires,
			JWT_ACCESS_EXPIRES_IN: expectedAccessExpires,
		};
		const config = authConfig();
		expect(config.JWT_SECRET).toBe(expectedSecret);
		expect(config.JWT_REFRESH_EXPIRES_IN).toBe(expectedRefreshExpires);
		expect(config.JWT_ACCESS_EXPIRES_IN).toBe(expectedAccessExpires);
		process.env = originalEnv;
	});
});
