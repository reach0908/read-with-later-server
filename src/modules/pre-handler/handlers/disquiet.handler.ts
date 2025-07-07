import { Injectable, Logger } from '@nestjs/common';
import { AbstractContentHandler } from '../base/abstract-content-handler';
import {
	DomConfig,
	HttpRequestConfig,
	TitleExtractionConfig,
	ContentCleaningConfig,
	ContentExtractionResult,
} from '../types/content-extraction.types';
import { JSDOM } from 'jsdom';
import { fetchHtml, createDom, extractTitle } from '../utils/functional-utils';
import { createContentCleaningPipeline } from '../utils/content-cleaning-pipeline';
import { Result } from '../utils/functional-utils';

/**
 * Disquiet.io 사이트 전용 핸들러
 *
 * Disquiet.io는 로그인 유도 팝업이 나타나는 문제가 있어서,
 * 특별한 처리가 필요합니다.
 *
 * 주요 특징:
 * - 로그인 팝업 제거
 * - 동적 콘텐츠 로딩 대기
 * - 특정 CSS 선택자로 콘텐츠 추출
 */
@Injectable()
export class DisquietHandler extends AbstractContentHandler {
	protected readonly logger = new Logger(DisquietHandler.name);

	/**
	 * 핸들러가 처리할 수 있는 URL인지 확인
	 * @param url 검사할 URL
	 * @returns true if can handle
	 */
	public canHandle(url: URL): boolean {
		const result = url.hostname.endsWith('disquiet.io');
		this.logger.debug(`DisquietHandler canHandle: ${url.hostname} -> ${result}`);
		return result;
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return 'DisquietHandler';
	}

	/**
	 * HTTP 요청 설정
	 */
	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent:
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			timeout: 30000,
			headers: {
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
				'Accept-Encoding': 'gzip, deflate, br',
				DNT: '1',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
			},
			redirect: 'follow',
		};
	}

	/**
	 * DOM 생성 설정 (스크립트 활성화로 동적 콘텐츠 처리)
	 */
	protected get domConfig(): DomConfig {
		return {
			userAgent: this.httpConfig.userAgent,
			resources: 'usable',
			runScripts: 'dangerously', // 동적 콘텐츠를 위해 스크립트 실행
			pretendToBeVisual: true,
		};
	}

	/**
	 * 콘텐츠 정제 설정
	 */
	protected get cleaningConfig(): ContentCleaningConfig {
		return {
			removeUnwantedElements: true,
			cleanupStyles: false,
			cleanupLinks: false,
			cleanupImages: false,
			cleanupText: false,
			refineTitle: false,
		};
	}

	/**
	 * 제목 추출 설정
	 */
	protected get titleConfig(): TitleExtractionConfig {
		return {
			selectors: [
				'h1',
				'.post-title',
				'.article-title',
				'[data-testid="post-title"]',
				'header h1',
				'header .title',
				'meta[property="og:title"]',
				'.title.detail-page',
				'.title-wrapper .title',
				// Disquiet.io 전용 선택자
				'[data-testid="makerlog-title"]',
				'.makerlog-title',
				'.post-header h1',
				'.post-header .title',
			],
			patterns: [],
			siteSpecificPatterns: {},
		};
	}

	/**
	 * 콘텐츠 선택자 (Disquiet.io 전용으로 최적화)
	 */
	protected get contentSelectors(): readonly string[] {
		return [
			// Disquiet.io 전용 선택자 (우선순위 높음)
			'[data-testid="makerlog-content"]',
			'[data-testid="post-content"]',
			'.makerlog-content',
			'.maker-log-detail',

			// 이하 기존 선택자
			'.post-content',
			'.article-content',
			'.content-wrapper',
			'.content-area',
			'.post-body',
			'.article-body',
			'.makerlog-body',
			'.post-detail',
			'.article-detail',
			'.detail-content',
			'.main-content',
			'.content',
			'article',
			'main',
			'.container',
			'#content',
			'.body',
			'.markdown-body',
			'.reader-content',
			'.entry-content',
			'.blog-post',
			'.post',
			'.detail',
			'.detail-page',
			// Disquiet.io 특정 클래스
			'.sc-keuYuY',
			'.sc-keuYuY.detail-page',
			'.title.detail-page',
			// 추가 Disquiet.io 선택자
			'[class*="makerlog"]',
			'[class*="post-"]',
			'[class*="article-"]',
			'[class*="content"]',
			'[class*="body"]',
		];
	}

	/**
	 * 로그인 팝업 등 불필요한 요소 제거 (후처리)
	 * @param dom JSDOM 인스턴스
	 */
	protected postProcessDom(dom: Document): void {
		// Disquiet.io 전용 제거 요소 (더 구체적으로)
		const removeSelectors = [
			// 로그인/인증 관련
			'[data-testid="login-modal"]',
			'[data-testid="auth-modal"]',
			'.login-modal',
			'.auth-modal',
			'.modal',
			'.popup',
			'.Dialog',
			'.modal-backdrop',
			'.overlay',
			'.Dialog-overlay',
			'.backdrop',
			// 네비게이션/헤더/푸터
			'.header',
			'.footer',
			'.nav',
			'.navigation',
			'.menu',
			'.sidebar',
			// 광고/프로모션
			'.ad',
			'.advertisement',
			'.promo',
			'.sponsor',
			'.banner',
			// 소셜/공유
			'.share',
			'.social',
			'.comment',
			'.comments',
			// 기타 UI 요소
			'.button',
			'.actions',
			'.toolbar',
			'.widget',
			'.tool',
			'.search',
			'.breadcrumb',
			'.pagination',
			'.page-nav',
			// 메타 정보 (제목은 유지)
			'.meta',
			'.info',
			'.date',
			'.time',
			'.author',
			'.tag',
			'.category',
			'.label',
			'.count',
			'.view',
			'.like',
			'.dislike',
			'.vote',
			'.star',
			'.rating',
			// 미디어 (텍스트 콘텐츠에 집중)
			'.icon',
			'.svg',
			'.img',
			'.figure',
			'.caption',
			'.gallery',
			'.media',
			'.video',
			'.audio',
			// 관련 콘텐츠
			'.related',
			'.related-posts',
			'.related-articles',
			'.recommend',
			'.suggest',
			'.popular',
			'.trending',
			'.recent',
			// 기술적 요소
			'script',
			'style',
			'noscript',
			'iframe',
			// 기타 불필요 요소
			'.subscribe',
			'.newsletter',
			'.cookie',
			'.consent',
			'.file',
			'.download',
			'.attachment',
			'.external',
			'.internal',
			'.link',
		];

		// 요소 제거 (콘텐츠 보존)
		removeSelectors.forEach((selector) => {
			dom.querySelectorAll(selector).forEach((el) => {
				// 콘텐츠가 포함된 요소는 제거하지 않음
				const textContent = el.textContent?.trim();
				if (textContent && textContent.length > 50) {
					this.logger.debug(`콘텐츠 보존: ${selector} (${textContent.length}글자)`);
					return;
				}
				el.remove();
			});
		});

		this.logger.log('Disquiet.io 전용 요소 제거 완료 (콘텐츠 보존)');
	}

	/**
	 * 동적 콘텐츠 로딩을 위한 대기 시간 추가
	 * @param dom JSDOM 인스턴스
	 */
	protected async waitForDynamicContent(dom: Document): Promise<void> {
		// Disquiet.io는 동적 콘텐츠 로딩이 필요할 수 있음
		await new Promise((resolve) => setTimeout(resolve, 2000));
		// 콘텐츠가 로드되었는지 확인
		const contentSelectors = this.contentSelectors;
		for (const selector of contentSelectors) {
			const elements = dom.querySelectorAll(selector);
			for (const element of elements) {
				const textContent = element.textContent?.trim();
				if (textContent && textContent.length > 100) {
					this.logger.debug(`동적 콘텐츠 확인: ${selector} (${textContent.length}글자)`);
					return;
				}
			}
		}
	}

	/**
	 * 여러 div(본문 파편)를 모두 합쳐서 반환하는 extractContent 오버라이드
	 */
	protected override async extractContent(url: URL): Promise<Result<ContentExtractionResult, Error>> {
		try {
			const htmlResult = await fetchHtml(url.href, this.httpConfig);
			if (!htmlResult.success) {
				return { success: false, error: htmlResult.error };
			}
			const domResult = createDom(htmlResult.data, this.domConfig);
			if (!domResult.success) {
				return { success: false, error: domResult.error };
			}
			const dom: JSDOM = domResult.data;
			const document = dom.window.document;

			// waitForDynamicContent가 존재하는지 타입 가드로 안전하게 호출
			if (
				typeof (this as unknown as { waitForDynamicContent?: (doc: Document) => Promise<void> })
					.waitForDynamicContent === 'function'
			) {
				await (
					this as unknown as { waitForDynamicContent: (doc: Document) => Promise<void> }
				).waitForDynamicContent(document);
			}
			// 제목 추출
			const titleOption = extractTitle(document, this.titleConfig.selectors, this.titleConfig.patterns);
			const title: string | undefined = titleOption == null ? undefined : titleOption;
			// 여러 div를 모두 합쳐서 본문으로 사용
			const elements = Array.from(document.querySelectorAll(this.contentSelectors.join(',')));
			const content = elements.map((el) => el.innerHTML).join('\n');
			if (!content || content.trim().length < 10) {
				this.logger.debug(`${this.handlerName} 본문 요소를 찾지 못해 body로 fallback`);
				return { success: true, data: { title, contentType: 'text/html', url: url.href } };
			}
			// 콘텐츠 정제
			const cleaningPipeline = createContentCleaningPipeline(this.cleaningConfig);
			const fakeElement = document.createElement('div');
			fakeElement.innerHTML = content;
			const cleanedElement = cleaningPipeline(fakeElement, {
				baseUrl: url.href,
				config: this.cleaningConfig,
				logger: this.logger,
			});
			const result: ContentExtractionResult = {
				title,
				content: cleanedElement.outerHTML,
				contentType: 'text/html',
				url: url.href,
			};
			return { success: true, data: result };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
		}
	}
}
