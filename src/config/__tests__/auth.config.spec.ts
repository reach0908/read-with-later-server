import authConfig from '../auth.config';

describe('authConfig', () => {
	it('should return default JWT values if env is not set', () => {
		const config = authConfig();
		expect(config.JWT_SECRET).toBeDefined();
		expect(config.JWT_REFRESH_EXPIRES_IN).toBe('7d');
		expect(config.JWT_ACCESS_EXPIRES_IN).toBe('15m');
	});
});
