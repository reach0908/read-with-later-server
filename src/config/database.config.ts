import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
	DATABASE_URL: process.env.DATABASE_URL || '',
	DIRECT_URL: process.env.DIRECT_URL || '',
}));
