import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
	PORT: process.env.PORT || 4000,
	HOST: process.env.HOST || 'localhost',
}));
