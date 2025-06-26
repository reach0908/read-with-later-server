import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
	GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',
}));
