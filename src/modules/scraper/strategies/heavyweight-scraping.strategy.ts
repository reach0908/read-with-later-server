import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { existsSync } from 'fs';
import { ScrapingStrategy, ScrapedContent } from '../interfaces/scraping-strategy.interface';
import { SCRAPER_CONSTANTS } from '../constants/scraper.constants';

// Stealth 플러그인 동적 import
const setupPuppeteer = async () => {
	try {
		const StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
		puppeteer.use(StealthPlugin());
	} catch {
		console.warn('Stealth plugin not available, proceeding without it');
	}
};

// 플러그인 설정 실행
setupPuppeteer();

// Readability의 반환 Article 타입 정의
interface ReadabilityArticle {
	title: string;
	byline: string | null;
	dir: string;
	content: string;
	textContent: string;
	length: number;
	excerpt: string;
	siteName: string | null;
}

@Injectable()
export class HeavyweightScrapingStrategy implements ScrapingStrategy {
	private readonly logger = new Logger(HeavyweightScrapingStrategy.name);

	async scrape(url: string): Promise<ScrapedContent> {
		try {
			const html = await this.fetchHtmlWithPuppeteer(url);
			const article = this.extractContent(html, url);

			if (!article || !article.content) {
				throw new Error('Failed to extract content with heavyweight strategy');
			}

			return this.transformToScrapedContent(article);
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Heavyweight scraping failed for ${url}: ${err.message}`);
			throw error;
		}
	}

	canHandle(): boolean {
		// 폴백 전략으로 모든 URL을 처리할 수 있음
		return true;
	}

	getPriority(): number {
		return SCRAPER_CONSTANTS.PRIORITY.HIGH;
	}

	getStrategyName(): string {
		return SCRAPER_CONSTANTS.STRATEGY.HEAVYWEIGHT;
	}

	private async fetchHtmlWithPuppeteer(url: string): Promise<string> {
		const browser = await puppeteer.launch({
			headless: true,
			args: [
				...SCRAPER_CONSTANTS.PUPPETEER.LAUNCH_ARGS,
				'--disable-dev-shm-usage',
				'--disable-background-timer-throttling',
				'--disable-backgrounding-occluded-windows',
				'--disable-renderer-backgrounding',
				'--disable-blink-features=AutomationControlled',
				'--disable-features=VizDisplayCompositor',
			],
			// Chrome 실행 파일 자동 탐지
			executablePath: this.getChromiumExecutablePath(),
		});

		try {
			const page = await browser.newPage();

			// 더 자연스러운 브라우저 환경 설정
			await page.setViewport({ width: 1366, height: 768 });

			// User-Agent를 더 자연스럽게 설정
			await page.setUserAgent(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
			);

			// 추가 헤더 설정
			await page.setExtraHTTPHeaders({
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
				'Accept-Encoding': 'gzip, deflate, br',
				DNT: '1',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
			});

			// 봇 감지 방지를 위한 JavaScript 실행
			await page.evaluateOnNewDocument(() => {
				// webdriver 속성 숨기기
				Object.defineProperty(navigator, 'webdriver', {
					get: () => undefined,
				});

				// Chrome runtime 객체 추가
				window.chrome = { runtime: {} };
			});

			// 리소스 차단은 Medium에서는 비활성화 (감지 우회를 위해)
			// await page.setRequestInterception(true);
			// page.on('request', (req) => {
			// 	const resourceType = req.resourceType();
			// 	if (SCRAPER_CONSTANTS.PUPPETEER.BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
			// 		req.abort();
			// 	} else {
			// 		req.continue();
			// 	}
			// });

			// 페이지 로딩
			await page.goto(url, {
				waitUntil: 'networkidle2',
				timeout: SCRAPER_CONSTANTS.PUPPETEER.TIMEOUT,
			});

			// 자연스러운 지연 (1-3초)
			const delay = Math.random() * 2000 + 1000;
			await new Promise((resolve) => setTimeout(resolve, delay));

			// 스크롤 시뮬레이션 (자연스러운 동작)
			await page.evaluate(() => {
				window.scrollBy(0, window.innerHeight / 2);
			});
			await new Promise((resolve) => setTimeout(resolve, 500));

			return await page.content();
		} finally {
			await browser.close();
		}
	}

	private extractContent(html: string, url: string): ReadabilityArticle | null {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const doc = new (JSDOM as unknown as { new (html: string, opts?: any): JSDOM })(html, { url }) as any;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		const reader = new (Readability as unknown as { new (doc: Document): Readability })(doc.window.document) as any;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		return reader.parse() as ReadabilityArticle | null;
	}

	private transformToScrapedContent(article: ReadabilityArticle): ScrapedContent {
		return {
			title: article.title,
			content: article.textContent, // 텍스트 콘텐츠를 content로 저장
			htmlContent: article.content, // 원본 HTML을 htmlContent로 저장
			author: article.byline ?? null,
			excerpt: article.excerpt,
		};
	}

	private getChromiumExecutablePath(): string | undefined {
		// 환경변수에서 Chrome 경로 확인
		if (process.env.CHROME_BIN) {
			return process.env.CHROME_BIN;
		}

		// 운영체제별 기본 Chrome 경로들
		const possiblePaths = [
			// macOS
			'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
			'/Applications/Chromium.app/Contents/MacOS/Chromium',
			// Linux
			'/usr/bin/google-chrome-stable',
			'/usr/bin/google-chrome',
			'/usr/bin/chromium-browser',
			'/usr/bin/chromium',
			// Windows
			'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
			'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
		];

		for (const path of possiblePaths) {
			try {
				if (existsSync(path)) {
					this.logger.log(`Found Chrome executable at: ${path}`);
					return path;
				}
			} catch {
				// 경로 확인 실패 시 무시
			}
		}

		// 경로를 찾지 못한 경우 undefined 반환 (Puppeteer 기본 동작)
		this.logger.warn('Chrome executable not found, using Puppeteer default');
		return undefined;
	}
}
