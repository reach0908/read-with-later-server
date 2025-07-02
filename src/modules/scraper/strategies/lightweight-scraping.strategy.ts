import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ScrapingStrategy, ScrapedContent } from '../interfaces/scraping-strategy.interface';
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
export class LightweightScrapingStrategy implements ScrapingStrategy {
	private readonly logger = new Logger(LightweightScrapingStrategy.name);

	async scrape(url: string): Promise<ScrapedContent> {
		this.logger.log(`Starting lightweight scraping for: ${url}`);

		try {
			const html = await this.fetchHtml(url);
			this.logger.log(`Successfully fetched HTML, length: ${html.length}`);

			const article = this.extractContent(html, url);

			if (!article) {
				this.logger.warn(`Readability failed to parse content for ${url}`);
				throw new Error('Readability failed to parse content');
			}

			if (!article.content || article.content.trim().length === 0) {
				this.logger.warn(`No content extracted from ${url}. Title: ${article.title || 'N/A'}`);
				throw new Error('No content extracted from article');
			}

			this.logger.log(
				`Successfully extracted content. Title: "${article.title}", Content length: ${article.content.length}`,
			);
			return this.transformToScrapedContent(article);
		} catch (error) {
			const err = error as Error;
			this.logger.warn(`Lightweight scraping failed for ${url}: ${err.message}`);
			throw error;
		}
	}

	canHandle(): boolean {
		// 모든 URL을 처리할 수 있음 (우선순위가 높음)
		return true;
	}

	getPriority(): number {
		return SCRAPER_CONSTANTS.PRIORITY.LOW;
	}

	getStrategyName(): string {
		return SCRAPER_CONSTANTS.STRATEGY.LIGHTWEIGHT;
	}

	private async fetchHtml(url: string): Promise<string> {
		const response: AxiosResponse<string> = await axios.get(url, {
			headers: {
				'User-Agent': SCRAPER_CONSTANTS.HTTP.USER_AGENT,
			},
			timeout: SCRAPER_CONSTANTS.HTTP.TIMEOUT,
		});
		return response.data;
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
}
