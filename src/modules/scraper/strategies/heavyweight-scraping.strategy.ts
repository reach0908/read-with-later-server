import { Injectable, Logger, Inject } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ScrapingStrategy, ScrapedContent } from '../interfaces/scraping-strategy.interface';
import { HtmlConverter } from '../interfaces/html-converter.interface';
import { HTML_CONVERTER_TOKEN } from '../constants/injection.tokens';
import { SCRAPER_CONSTANTS } from '../constants/scraper.constants';

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

	constructor(
		@Inject(HTML_CONVERTER_TOKEN)
		private readonly htmlConverter: HtmlConverter,
	) {}

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
		return SCRAPER_CONSTANTS.PRIORITY.LOW;
	}

	getStrategyName(): string {
		return SCRAPER_CONSTANTS.STRATEGY.HEAVYWEIGHT;
	}

	private async fetchHtmlWithPuppeteer(url: string): Promise<string> {
		const browser = await puppeteer.launch({
			headless: true,
			args: SCRAPER_CONSTANTS.PUPPETEER.LAUNCH_ARGS,
		});

		try {
			const page = await browser.newPage();

			// 리소스 차단으로 성능 향상
			await page.setRequestInterception(true);
			page.on('request', (req) => {
				const resourceType = req.resourceType();
				if (SCRAPER_CONSTANTS.PUPPETEER.BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
					req.abort();
				} else {
					req.continue();
				}
			});

			// 타임아웃 설정
			await page.goto(url, {
				waitUntil: 'networkidle2',
				timeout: SCRAPER_CONSTANTS.PUPPETEER.TIMEOUT,
			});

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
		const markdown = this.htmlConverter.convert(article.content);

		return {
			title: article.title,
			content: markdown,
			textContent: article.textContent,
			author: article.byline ?? null,
			excerpt: article.excerpt,
		};
	}
}
