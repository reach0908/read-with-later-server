import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
	JWT_SECRET: process.env.JWT_SECRET || '',
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
	GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',
}));
