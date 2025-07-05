import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { AbstractContentHandler } from '../base/abstract-content-handler';
import {
	HttpRequestConfig,
	DomConfig,
	ContentCleaningConfig,
	TitleExtractionConfig,
} from '../types/content-extraction.types';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * Readability 기반 리팩토링된 콘텐츠 핸들러
 * - AbstractContentHandler 기반
 * - SOLID 원칙 및 함수형 프로그래밍 적용
 */
@Injectable()
export class ReadabilityHandler extends AbstractContentHandler {
	protected readonly logger = new Logger(ReadabilityHandler.name);
	private readonly USER_AGENT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

	/**
	 * Readability는 모든 http/https URL을 처리할 수 있음
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		return ['http:', 'https:'].includes(url.protocol);
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return 'Readability 핸들러';
	}

	/**
	 * HTTP 요청 설정 (표준)
	 */
	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent: this.USER_AGENT,
			timeout: 10000,
			headers: {},
			redirect: 'follow',
		};
	}

	/**
	 * DOM 생성 설정 (스크립트 활성화)
	 */
	protected get domConfig(): DomConfig {
		return {
			userAgent: this.httpConfig.userAgent,
			resources: 'usable',
			runScripts: 'dangerously',
			pretendToBeVisual: true,
		};
	}

	/**
	 * 콘텐츠 정제 설정 (Readability는 자체 정제)
	 */
	protected get cleaningConfig(): ContentCleaningConfig {
		return {
			removeUnwantedElements: false,
			cleanupStyles: false,
			cleanupLinks: false,
			cleanupImages: false,
			cleanupText: false,
			refineTitle: true,
		};
	}

	/**
	 * 제목 추출 설정 (Readability 결과 기반)
	 */
	protected get titleConfig(): TitleExtractionConfig {
		return {
			selectors: [],
			patterns: [],
			siteSpecificPatterns: {},
		};
	}

	/**
	 * 본문 콘텐츠 추출용 셀렉터 (Readability는 사용하지 않음)
	 */
	protected get contentSelectors(): readonly string[] {
		return [];
	}

	/**
	 * Fetches the webpage, parses it with JSDOM, and extracts the article content.
	 * @param url - The URL to handle.
	 * @returns A `PreHandleResult` with the extracted article, or `null` on failure.
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			// 1차 시도: 스크립트 활성화 DOM
			let dom = await this.createDOMWithScripts(url.href);
			let article = this.extractContentFromDOM(dom);
			// 실패 시: 스크립트 비활성화 DOM 재시도
			if (!article?.content) {
				this.logger.debug(`First attempt failed, trying without scripts for ${url.href}`);
				dom = await this.createDOMWithoutScripts(url.href);
				article = this.extractContentFromDOM(dom);
			}
			if (!article?.content) {
				this.logger.debug(`No readable content found for ${url.href}`);
				return null;
			}
			this.logger.log(`Successfully extracted readable content: ${article.content.length} chars`);
			return {
				url: url.href,
				title: article.title ?? undefined,
				content: article.content ?? undefined,
				contentType: 'text/html',
			};
		} catch (error) {
			this.logger.warn(`ReadabilityHandler failed for ${url.href}: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * 스크립트 활성화 JSDOM 생성
	 */
	private async createDOMWithScripts(url: string): Promise<JSDOM> {
		return JSDOM.fromURL(url, {
			userAgent: this.httpConfig.userAgent,
			resources: 'usable',
			runScripts: 'dangerously',
			pretendToBeVisual: true,
		});
	}

	/**
	 * 스크립트 비활성화 JSDOM 생성
	 */
	private async createDOMWithoutScripts(url: string): Promise<JSDOM> {
		return JSDOM.fromURL(url, {
			userAgent: this.httpConfig.userAgent,
			resources: 'usable',
			runScripts: 'outside-only',
			pretendToBeVisual: true,
		});
	}

	/**
	 * Readability로 콘텐츠 추출
	 */
	private extractContentFromDOM(dom: JSDOM): { title?: string; content?: string } | null {
		try {
			const reader = new Readability(dom.window.document);
			const article = reader.parse();
			if (!article) return null;
			return { title: article.title ?? undefined, content: article.content ?? undefined };
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
