import { Injectable, Logger } from '@nestjs/common';
import { BrowserContext, Page, Protocol } from 'puppeteer-core';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { BrowserService } from './browser.service';
import { FetchContentInput } from '../dto/fetch-content.input';
import { ScrapedContentOutput } from '../dto/scraped-content.output';
import { InvalidUrlException } from '../exceptions/invalid-url.exception';
import { PreHandlerService } from '../../pre-handler/pre-handler.service';
import { ArticleService } from '../../article/services/article.service';
import { ContentQualityEvaluator } from './content-quality-evaluator';
import { SecurityService } from '../../security/services/security.service';

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
		private readonly articleService: ArticleService,
		private readonly contentQualityEvaluator: ContentQualityEvaluator,
		private readonly securityService: SecurityService,
	) {}

	/**
	 * Fetch readable content from the given URL.
	 */
	async fetchContent({ url, locale, timezone }: FetchContentInput): Promise<ScrapedContentOutput> {
		// 1. URL 정규화 및 보안 검사 (모든 요청의 시작점)
		const normalizedUrl = this.normalizeUrl(url);
		await this.securityService.checkUrlSafety(normalizedUrl);

		// 2. Pre-handling (Fast Path)
		const preHandleResult = await this.preHandlerService.execute(normalizedUrl);

		// PDF 같은 특수 콘텐츠는 여기서 처리하고 바로 반환
		if (preHandleResult.contentType === 'application/pdf') {
			this.logger.log(`PDF content detected. Skipping further processing for: ${preHandleResult.url}`);
			return {
				finalUrl: preHandleResult.url,
				title: preHandleResult.title,
				content: preHandleResult.content,
				contentType: preHandleResult.contentType,
			};
		}

		let finalContent = preHandleResult.content;
		let finalTitle = preHandleResult.title;
		let finalUrl = preHandleResult.url;
		let finalContentType = preHandleResult.contentType;

		// 3. 품질 평가 및 Puppeteer 폴백 결정
		// Pre-handler가 HTML을 제공했거나, 아무것도 제공하지 못한 경우 Puppeteer 사용을 고려
		let needsPuppeteer = !finalContent;
		if (finalContent && finalContentType?.includes('html')) {
			const qualityMetrics = this.contentQualityEvaluator.evaluate(finalContent, finalContent, {}, finalUrl);
			if (this.contentQualityEvaluator.shouldUsePuppeteer(qualityMetrics, {}, finalUrl)) {
				needsPuppeteer = true;
				this.logger.log(`Content quality is low. Falling back to Puppeteer for: ${finalUrl}`);
			} else {
				this.logger.log(`Content quality is sufficient. Using pre-handled content for: ${finalUrl}`);
			}
		}

		// 4. Puppeteer 실행 (Slow Path)
		if (needsPuppeteer) {
			this.logger.log(`Executing Puppeteer fallback for: ${finalUrl}`);
			const puppeteerResult = await this.runPuppeteerScraping({ url: finalUrl, locale, timezone });

			// Puppeteer 결과를 최종 결과로 사용 (Readability는 나중에 일괄 적용)
			finalContent = puppeteerResult.content;
			finalTitle = finalTitle || puppeteerResult.title; // Pre-handler 타이틀이 있으면 유지
			finalUrl = puppeteerResult.finalUrl;
			finalContentType = puppeteerResult.contentType;
		}

		// 5. 최종 정제 (Readability)
		// HTML 콘텐츠가 있는 경우, 항상 Readability를 적용하여 일관된 품질의 본문 추출
		if (finalContent && finalContentType?.includes('html')) {
			finalContent = await this.applyReadabilityToHtml(finalContent, finalUrl);
		}

		return {
			finalUrl,
			title: finalTitle,
			content: finalContent,
			contentType: finalContentType,
		};
	}

	/**
	 * Fetch content and optionally save to database.
	 */
	async fetchContentWithSave(input: FetchContentWithSaveInput): Promise<ScrapedContentOutput> {
		const { userId, saveToDatabase, tags, isBookmarked, isArchived, ...fetchInput } = input;

		// 일반 스크래핑 수행
		const scrapedContent = await this.fetchContent(fetchInput);

		// 데이터베이스 저장 옵션이 활성화된 경우
		if (saveToDatabase && userId) {
			try {
				await this.articleService.saveScrapedContent(userId, scrapedContent, {
					tags,
					isBookmarked,
					isArchived,
				});
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

		// 웹페이지의 모든 콘솔 출력과 에러를 완전히 억제
		page.on('console', () => {
			// 아무 동작도 하지 않음 (출력 억제)
			return;
		});

		// 페이지 에러 이벤트도 억제
		page.on('pageerror', () => {
			// 아무 동작도 하지 않음 (에러 출력 억제)
			return;
		});

		// 웹소켓 에러도 억제
		page.on('error', () => {
			// 아무 동작도 하지 않음 (에러 출력 억제)
			return;
		});

		// 브라우저 콘솔 에러도 억제
		page.on('crash', () => {
			// 아무 동작도 하지 않음 (크래시 출력 억제)
			return;
		});

		// 페이지 내부에서 발생하는 모든 에러를 억제하기 위한 스크립트 주입
		await page.evaluateOnNewDocument(() => {
			// console 메서드들을 무시하도록 재정의
			console.log = () => {};
			console.error = () => {};
			console.warn = () => {};
			console.info = () => {};
			console.debug = () => {};

			// window.onerror를 무시하도록 설정
			window.onerror = () => true;

			// unhandledrejection 이벤트도 무시
			window.addEventListener('unhandledrejection', (e) => {
				e.preventDefault();
			});

			// adsbygoogle 관련 에러 억제
			if (typeof window !== 'undefined') {
				const w = window as unknown as { adsbygoogle: Array<unknown> };
				w.adsbygoogle = w.adsbygoogle || [];
				// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unnecessary-type-assertion
				(w.adsbygoogle as unknown[]).push = (..._items: unknown[]): number => 0;
			}
		});

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
		// Request interception 활성화 (page-level)
		await page.setRequestInterception(true);

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

	/**
	 * HTML 콘텐츠에 Readability를 적용하여 본문만 추출합니다.
	 * @param html - 전체 HTML 콘텐츠
	 * @param url - 원본 URL (상대 링크 처리용)
	 * @returns 정제된 콘텐츠 또는 원본 HTML (실패 시)
	 */
	private applyReadabilityToHtml(html: string, url: string): Promise<string> {
		try {
			const dom = new JSDOM(html, { url });
			const reader = new Readability(dom.window.document);
			const article = reader.parse();

			if (article?.content) {
				this.logger.log(`Successfully extracted readable content from HTML (${article.content.length} chars)`);
				return Promise.resolve(article.content);
			} else {
				this.logger.warn(`Readability failed to extract content from HTML, using original`);
			}
		} catch (error) {
			this.logger.warn(`Failed to apply Readability to HTML: ${(error as Error).message}`);
		}

		// 실패 시 원본 반환
		return Promise.resolve(html);
	}

	/**
	 * Executes the Puppeteer scraping process.
	 * This includes navigating to the page, extracting HTML, and closing resources.
	 * @param params Parameters for page retrieval.
	 * @returns The scraped content, not yet processed by Readability.
	 */
	private async runPuppeteerScraping(params: RetrievePageParams): Promise<ScrapedContentOutput> {
		const pageResult = await this.retrievePage(params);

		// SSRF 방어 강화: 리다이렉트 후 최종 URL 재검증
		this.validateUrl(pageResult.finalUrl);
		await this.securityService.checkUrlSafety(pageResult.finalUrl); // 리다이렉트된 URL도 재검증

		let content: string | undefined;
		let title: string | undefined;

		if (pageResult.page) {
			const html = await this.retrieveHtml(pageResult.page);
			title = html.title;
			content = html.content; // Readability는 상위 스코프에서 일괄 적용
		}

		await pageResult.context?.close();

		return {
			finalUrl: pageResult.finalUrl,
			title,
			content,
			contentType: pageResult.contentType,
		};
	}
}
