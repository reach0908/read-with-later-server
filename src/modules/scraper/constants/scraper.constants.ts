export const SCRAPER_CONSTANTS = {
	HTTP: {
		TIMEOUT: 10000, // 10초
		USER_AGENT:
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
	},
	PUPPETEER: {
		TIMEOUT: 30000, // 30초
		LAUNCH_ARGS: ['--no-sandbox', '--disable-setuid-sandbox'] as string[],
		BLOCKED_RESOURCE_TYPES: ['image', 'stylesheet', 'font', 'media'] as string[],
	},
	TURNDOWN: {
		HEADING_STYLE: 'atx' as const,
		CODE_BLOCK_STYLE: 'fenced' as const,
		PRESERVED_ELEMENTS: ['pre', 'iframe'] as string[],
	},
	STRATEGY: {
		LIGHTWEIGHT: 'LIGHTWEIGHT',
		HEAVYWEIGHT: 'HEAVYWEIGHT',
	},
	PRIORITY: {
		HIGH: 1,
		LOW: 2,
	},
} as const;
