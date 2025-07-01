import databaseConfig from '../database.config';

describe('databaseConfig', () => {
	it('should return empty string if env is not set', () => {
		const config = databaseConfig();
		expect(config.DATABASE_URL).toBe('');
		expect(config.DIRECT_URL).toBe('');
	});
});
