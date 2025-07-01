import appConfig from '../app.config';

describe('appConfig', () => {
	it('should return default values if env is not set', () => {
		const config = appConfig();
		expect(config.BASE_URL).toContain('localhost');
		expect(config.CLIENT_URL).toContain('localhost');
	});
});
