import { Injectable, Logger, Optional } from '@nestjs/common';
import { BrowserContext, Page, Protocol } from 'puppeteer-core';
import { BrowserService } from './browser.service';
import { FetchContentInput } from '../dto/fetch-content.input';
import { ScrapedContentOutput } from '../dto/scraped-content.output';
import { InvalidUrlException } from '../exceptions/invalid-url.exception';
import { PreHandlerService } from '../../pre-handler/pre-handler.service';
import { ArticleService } from '../../article/services/article.service';

// ---------------------- CONSTANTS ----------------------
const NON_SCRIPT_HOSTS = ['medium.com', 'fastcompany.com', 'fortelabs.com'] as const;
const ALLOWED_CONTENT_TYPES = ['text/html', 'application/octet-stream', 'text/plain', 'application/pdf'] as const;

// Interfaces used by the service (kept outside the class for clarity)
export interface RetrievePageParams {
	url: string;
	locale?: string;
	timezone?: string;
}

export interface RetrievePageResult {
	page?: Page;
	context: BrowserContext;
	finalUrl: string;
	contentType: string;
}

export interface FetchContentWithSaveInput extends FetchContentInput {
	userId?: string;
	saveToDatabase?: boolean;
	tags?: string[];
	isBookmarked?: boolean;
	isArchived?: boolean;
}

/**
 * Service responsible for fetching and parsing remote HTML / PDF content using Puppeteer.
 */
@Injectable()
export class PuppeteerParseService {
	private readonly logger = new Logger(PuppeteerParseService.name);

	constructor(
		private readonly browserService: BrowserService,
		private readonly preHandlerService: PreHandlerService,
		@Optional() private readonly articleService?: ArticleService,
	) {}

	/**
	 * Fetch readable content from the given URL.
	 */
	async fetchContent({ url, locale, timezone }: FetchContentInput): Promise<ScrapedContentOutput> {
		const startedAt = Date.now();

		url = this.normalizeUrl(url);

		// (1) Execute pre-handling using the new extensible service
		const preHandleResult = await this.preHandlerService.execute(url);

		let { title, content, contentType } = preHandleResult;
		url = preHandleResult.url; // URL might have been changed by a handler

		// (2) Fetch via Puppeteer when necessary
		if (contentType !== 'application/pdf' && (!title || !content)) {
			const pageResult = await this.retrievePage({ url, locale, timezone });
			url = pageResult.finalUrl;
			contentType = pageResult.contentType;

			if (pageResult.page) {
				const html = await this.retrieveHtml(pageResult.page);
				title = html.title;
				content = html.content;
			}

			await pageResult.context?.close();
		}

		this.logger.debug(`Scraping done in ${Date.now() - startedAt} ms`);
		return { finalUrl: url, title, content, contentType };
	}

	/**
	 * Fetch content and optionally save to database.
	 */
	async fetchContentWithSave(input: FetchContentWithSaveInput): Promise<ScrapedContentOutput> {
		const { userId, saveToDatabase, tags, isBookmarked, isArchived, ...fetchInput } = input;

		// 일반 스크래핑 수행
		const scrapedContent = await this.fetchContent(fetchInput);

		// 데이터베이스 저장 옵션이 활성화되고 ArticleService가 사용 가능한 경우
		if (saveToDatabase && userId && this.articleService) {
			try {
				await this.articleService.saveScrapedContent(userId, scrapedContent, {
					tags,
					isBookmarked,
					isArchived,
				});
				this.logger.debug(`Content saved to database for user ${userId}: ${scrapedContent.finalUrl}`);
			} catch (error) {
				this.logger.warn(`Failed to save content to database: ${(error as Error).message}`);
				// 저장 실패해도 스크래핑 결과는 반환
			}
		}

		return scrapedContent;
	}

	// ----------------------------------------------------
	// ------------------ PRIVATE HELPERS ----------------
	// ----------------------------------------------------

	private normalizeUrl(raw: string): string {
		const extracted = this.tryParseUrl(raw);
		if (!extracted) throw new InvalidUrlException('value is empty');
		this.validateUrl(extracted);
		return new URL(extracted).href;
	}

	private tryParseUrl(str: string): string | null {
		const match = /(https?:\/\/[^\s]+)/i.exec(str);
		return match?.[0] ?? null;
	}

	private validateUrl(url: string): void {
		const parsed = new URL(url);
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			throw new InvalidUrlException('protocol must be http/https');
		}
		if (['localhost', '0.0.0.0'].includes(parsed.hostname)) {
			throw new InvalidUrlException('localhost not allowed');
		}
		if (/^(10|172\.16|192\.168)\./.test(parsed.hostname)) {
			throw new InvalidUrlException('private ip not allowed');
		}
	}

	private enableJavascriptForUrl(targetUrl: string): boolean {
		try {
			const host = new URL(targetUrl).hostname;
			return !NON_SCRIPT_HOSTS.some((h) => host.endsWith(h));
		} catch {
			return true;
		}
	}

	// -------------------- Puppeteer --------------------

	private async retrievePage({ url, locale, timezone }: RetrievePageParams): Promise<RetrievePageResult> {
		const browser = await this.browserService.getBrowser();
		const context = await browser.createBrowserContext();
		const page = await context.newPage();

		if (!this.enableJavascriptForUrl(url)) {
			await page.setJavaScriptEnabled(false);
		}
		if (locale) await page.setExtraHTTPHeaders({ 'Accept-Language': locale });
		if (timezone && process.env['USE_FIREFOX'] !== 'true') {
			await page.emulateTimezone(timezone);
		}

		await this.setupNetworkInterception(page);

		const response = await page.goto(url, { timeout: 30_000, waitUntil: ['load'] });
		if (!response) throw new Error('no response from page');

		await this.waitForDomToSettle(page);

		return {
			page,
			context,
			finalUrl: response.url(),
			contentType: response.headers()['content-type'] ?? 'text/html',
		};
	}

	private async setupNetworkInterception(page: Page): Promise<void> {
		const client = await page.createCDPSession();

		// PDF / MIME type blocking
		await client.send('Network.setRequestInterception', {
			patterns: [
				{
					urlPattern: '*',
					resourceType: 'Document',
					interceptionStage: 'HeadersReceived',
				},
			],
		});

		client.on('Network.requestIntercepted', (e: Protocol.Network.RequestInterceptedEvent) => {
			void (async () => {
				const headers = e.responseHeaders ?? {};
				const ctype = (headers['content-type'] ?? headers['Content-Type'] ?? '').split(';')[0].toLowerCase();
				const shouldBlock =
					ctype && !ALLOWED_CONTENT_TYPES.includes(ctype as (typeof ALLOWED_CONTENT_TYPES)[number]);

				await client.send('Network.continueInterceptedRequest', {
					interceptionId: e.interceptionId,
					...(shouldBlock ? { errorReason: 'BlockedByClient' } : {}),
				});
			})();
		});

		// request-level abort rules
		const failed = new Set<string>();
		page.on('request', (req) => {
			void (async () => {
				if (req.isInterceptResolutionHandled()) return;
				const url = req.url().toLowerCase();
				if (url.endsWith('.woff2') || url.includes('mathjax') || failed.has(url)) {
					await req.abort();
					return;
				}
				await req.continue();
			})();
		});

		page.on('response', (res) => {
			if (!res.ok()) failed.add(res.url());
		});
	}

	private async waitForDomToSettle(page: Page, timeoutMs = 5_000, debounceMs = 1_000): Promise<void> {
		await page.evaluate(
			(tout, deb) => {
				const debounce = (fn: () => void, ms: number) => {
					let t: ReturnType<typeof setTimeout>;
					return () => {
						clearTimeout(t);
						t = setTimeout(fn, ms);
					};
				};
				return new Promise<void>((resolve) => {
					const mainT = setTimeout(() => {
						obs.disconnect();
						resolve();
					}, tout);

					const obs = new MutationObserver(
						debounce(() => {
							clearTimeout(mainT);
							obs.disconnect();
							resolve();
						}, deb),
					);
					obs.observe(document.body, { childList: true, subtree: true, attributes: true });
				});
			},
			timeoutMs,
			debounceMs,
		);
	}

	// ------------------ HTML extraction ----------------

	private async retrieveHtml(page: Page): Promise<{ title?: string; content: string }> {
		const title = await page.title();
		await page.waitForSelector('body');

		await Promise.race([this.autoScroll(page), new Promise((r) => setTimeout(r, 5_000))]);

		const domContent = await page.evaluate(() => document.documentElement.outerHTML);
		return { title, content: domContent };
	}

	private async autoScroll(page: Page): Promise<void> {
		await page.evaluate(async () => {
			await new Promise<void>((resolve) => {
				let total = 0;
				const distance = 500;
				const timer = setInterval(() => {
					window.scrollBy(0, distance);
					total += distance;
					if (total >= document.body.scrollHeight) {
						clearInterval(timer);
						resolve();
					}
				}, 10);
			});
		});
	}
}
