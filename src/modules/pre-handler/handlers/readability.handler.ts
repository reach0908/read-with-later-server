import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * Readability 파싱 결과 타입
 */
interface ReadabilityResult {
	title: string | null;
	content: string | null;
	textContent: string | null;
	length: number;
	excerpt: string | null;
	byline: string | null;
	dir: string | null;
	siteName: string | null;
}

/**
 * A content handler that uses Mozilla's Readability library to extract
 * the main readable content from a generic webpage.
 */
@Injectable()
export class ReadabilityHandler implements IContentHandler {
	private readonly logger = new Logger(ReadabilityHandler.name);
	private readonly USER_AGENT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

	/**
	 * This handler can attempt to process any HTTP/HTTPS URL.
	 * It should typically be placed last in the handler chain as a fallback.
	 * @param url - The URL to check.
	 * @returns `true` if the protocol is http or https.
	 */
	public canHandle(url: URL): boolean {
		return ['http:', 'https:'].includes(url.protocol);
	}

	/**
	 * Fetches the webpage, parses it with JSDOM, and extracts the article content.
	 * @param url - The URL to handle.
	 * @returns A `PreHandleResult` with the extracted article, or `null` on failure.
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			// 첫 번째 시도: JavaScript 실행 활성화
			let dom = await this.createDOMWithScripts(url.href);
			let article = await this.extractContentFromDOM(dom);

			// JavaScript 실행 중 오류가 발생하면 두 번째 시도
			if (!article?.content) {
				this.logger.debug(`First attempt failed, trying without scripts for ${url.href}`);
				dom = await this.createDOMWithoutScripts(url.href);
				article = await this.extractContentFromDOM(dom);
			}

			if (!article?.content) {
				this.logger.debug(`No readable content found for ${url.href}`);
				return null;
			}

			this.logger.log(`Successfully extracted readable content: ${article.content.length} chars`);

			return {
				url: url.href,
				title: article.title ?? undefined,
				content: article.content,
				contentType: 'text/html',
			};
		} catch (error) {
			this.logger.warn(`ReadabilityHandler failed for ${url.href}: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * JavaScript 실행을 활성화한 JSDOM 생성
	 * @param url - 처리할 URL
	 * @returns JSDOM 인스턴스
	 */
	private async createDOMWithScripts(url: string): Promise<JSDOM> {
		const dom = await JSDOM.fromURL(url, {
			userAgent: this.USER_AGENT,
			resources: 'usable',
			runScripts: 'dangerously',
			pretendToBeVisual: true,
		});

		// 브라우저 API polyfill 추가
		this.addBrowserPolyfills(dom.window as unknown as Window & typeof globalThis);

		// 에러 핸들링 추가
		this.addErrorHandling(dom.window as unknown as Window & typeof globalThis);

		return dom;
	}

	/**
	 * JavaScript 실행을 비활성화한 JSDOM 생성
	 * @param url - 처리할 URL
	 * @returns JSDOM 인스턴스
	 */
	private async createDOMWithoutScripts(url: string): Promise<JSDOM> {
		return JSDOM.fromURL(url, {
			userAgent: this.USER_AGENT,
			resources: 'usable',
			runScripts: 'outside-only',
			pretendToBeVisual: true,
		});
	}

	/**
	 * DOM에서 콘텐츠 추출
	 * @param dom - JSDOM 인스턴스
	 * @returns 추출된 아티클 또는 null
	 */
	private async extractContentFromDOM(dom: JSDOM): Promise<ReadabilityResult | null> {
		try {
			// 페이지 로딩 대기
			await new Promise((resolve) => setTimeout(resolve, 2000));

			const reader = new Readability(dom.window.document);
			const article = reader.parse();

			return article as ReadabilityResult | null;
		} catch (error) {
			this.logger.debug(`Content extraction failed: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * 브라우저 API polyfill 추가
	 * @param window - JSDOM window 객체
	 */
	private addBrowserPolyfills(window: Window & typeof globalThis): void {
		// document.elementFromPoint polyfill
		if (!window.document.elementFromPoint) {
			window.document.elementFromPoint = function (_x: number, _y: number): Element | null {
				// 간단한 fallback 구현
				return window.document.body || window.document.documentElement;
			};
		}

		// MessageChannel polyfill
		if (!(window as any).MessageChannel) {
			(window as any).MessageChannel = class MessageChannel {
				port1: any;
				port2: any;

				constructor() {
					this.port1 = {
						postMessage: () => {},
						onmessage: null,
						close: () => {},
					};
					this.port2 = {
						postMessage: () => {},
						onmessage: null,
						close: () => {},
					};
				}
			};
		}

		// requestIdleCallback polyfill
		if (!(window as any).requestIdleCallback) {
			(window as any).requestIdleCallback = function (
				callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
				_options?: any,
			) {
				return setTimeout(() => {
					callback({
						didTimeout: false,
						timeRemaining: () => 50,
					});
				}, 1);
			};
		}

		// cancelIdleCallback polyfill
		if (!(window as any).cancelIdleCallback) {
			(window as any).cancelIdleCallback = function (id: number) {
				clearTimeout(id);
			};
		}

		// IntersectionObserver polyfill (최소 구현)
		if (!(window as any).IntersectionObserver) {
			(window as any).IntersectionObserver = class IntersectionObserver {
				constructor(_callback: any, _options?: any) {
					// 최소 구현
				}
				observe() {}
				unobserve() {}
				disconnect() {}
			};
		}

		// Performance API polyfill
		if (!window.performance) {
			(window as any).performance = {
				now: () => Date.now(),
				timeOrigin: Date.now(),
			};
		}

		// crypto polyfill (기본 구현)
		if (!window.crypto) {
			(window as any).crypto = {
				getRandomValues: (array: any) => {
					for (let i = 0; i < array.length; i++) {
						array[i] = Math.floor(Math.random() * 256);
					}
					return array;
				},
			};
		}
	}

	/**
	 * 에러 핸들링 추가
	 * @param window - JSDOM window 객체
	 */
	private addErrorHandling(window: Window & typeof globalThis): void {
		// 글로벌 에러 핸들러
		window.addEventListener('error', (event: ErrorEvent) => {
			// 특정 에러는 무시
			const ignoredErrors = [
				'elementFromPoint is not a function',
				'MessageChannel is not defined',
				'requestIdleCallback is not defined',
				'IntersectionObserver is not defined',
				'clarity',
				'TypeError: document.elementFromPoint is not a function',
				'ReferenceError: MessageChannel is not defined',
			];

			const errorMessage = event.error?.message || event.message || '';
			const shouldIgnore = ignoredErrors.some((ignoredError) =>
				errorMessage.toLowerCase().includes(ignoredError.toLowerCase()),
			);

			if (!shouldIgnore) {
				this.logger.debug(`JavaScript error in JSDOM: ${errorMessage}`);
			}

			// 에러 전파 방지
			event.preventDefault();
		});

		// Promise rejection 핸들러
		window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
			const reason = event.reason?.message || event.reason || '';
			const ignoredReasons = ['elementFromPoint', 'MessageChannel', 'clarity'];

			const shouldIgnore = ignoredReasons.some((ignored) => reason.toLowerCase().includes(ignored.toLowerCase()));

			if (!shouldIgnore) {
				this.logger.debug(`Unhandled promise rejection in JSDOM: ${reason}`);
			}

			// 에러 전파 방지
			event.preventDefault();
		});
	}
}
