import { registerAs } from '@nestjs/config';

export default registerAs('throttler', () => ({
	TTL: parseInt(process.env.THROTTLE_TTL ?? '60', 10), // 기본값 60초
	LIMIT: parseInt(process.env.THROTTLE_LIMIT ?? '10', 10), // 기본값 10
}));
