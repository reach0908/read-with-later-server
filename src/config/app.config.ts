import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
	BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
	CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
	BROWSER_PATH: process.env.BROWSER_PATH || '/usr/bin/chromium-browser',
	LOG_LEVEL: process.env.LOG_LEVEL || 'info',
	SUPPRESS_BROWSER_LOGS: process.env.SUPPRESS_BROWSER_LOGS === 'true',
}));
