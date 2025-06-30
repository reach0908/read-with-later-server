import { registerAs } from '@nestjs/config';

export default registerAs('crawler', () => ({
	HEADLESS: process.env.CRAWLER_HEADLESS !== 'false',
	MAX_REQUESTS_PER_CRAWL: parseInt(process.env.CRAWLER_MAX_REQUESTS_PER_CRAWL || '1', 10),
	REQUEST_HANDLER_TIMEOUT_SECS: parseInt(process.env.CRAWLER_REQUEST_HANDLER_TIMEOUT_SECS || '60', 10),
	USER_AGENT: process.env.CRAWLER_USER_AGENT || 'Mozilla/5.0 (compatible; ReadWithLater/1.0)',
	VIEWPORT_WIDTH: parseInt(process.env.CRAWLER_VIEWPORT_WIDTH || '1920', 10),
	VIEWPORT_HEIGHT: parseInt(process.env.CRAWLER_VIEWPORT_HEIGHT || '1080', 10),
	MEDIUM_WAIT_TIME: parseInt(process.env.CRAWLER_MEDIUM_WAIT_TIME || '5000', 10),
	ENABLE_IMAGES: process.env.CRAWLER_ENABLE_IMAGES !== 'false',
}));
