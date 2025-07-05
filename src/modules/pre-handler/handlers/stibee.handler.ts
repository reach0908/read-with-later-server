import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * 스티비(Stibee) 뉴스레터 플랫폼을 위한 전용 콘텐츠 핸들러
 * 스티비 뉴스레터의 특별한 구조와 스타일을 고려하여 최적화된 콘텐츠 추출을 제공합니다.
 */
@Injectable()
export class StibeeHandler implements IContentHandler {
	private readonly logger = new Logger(StibeeHandler.name);

	/**
	 * 스티비 뉴스레터 URL인지 확인합니다.
	 * @param url - 확인할 URL
	 * @returns 스티비 URL이면 true, 아니면 false
	 */
	public canHandle(url: URL): boolean {
		return url.hostname.endsWith('stibee.com');
	}

	/**
	 * 스티비 뉴스레터 콘텐츠를 추출합니다.
	 * @param url - 처리할 스티비 URL
	 * @returns 추출된 콘텐츠 또는 null
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			this.logger.debug(`스티비 뉴스레터 콘텐츠 추출 시작: ${url.href}`);

			// 스티비 뉴스레터 페이지에서 콘텐츠를 가져옵니다
			const result = await this.extractStibeeContent(url);

			if (!result.content) {
				this.logger.debug(`스티비 콘텐츠 추출 실패: ${url.href}`);
				return null;
			}

			this.logger.log(`스티비 콘텐츠 추출 성공: ${result.content.length} 글자`);

			return {
				url: url.href,
				title: result.title,
				content: result.content,
				contentType: 'text/html',
			};
		} catch (error) {
			this.logger.warn(`스티비 핸들러 처리 실패 ${url.href}: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * 스티비 뉴스레터에서 콘텐츠를 추출합니다.
	 * @param url - 스티비 뉴스레터 URL
	 * @returns 추출된 제목과 콘텐츠
	 */
	private async extractStibeeContent(url: URL): Promise<{
		title?: string;
		content?: string;
	}> {
		try {
			// AbortController로 타임아웃 설정
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 20000); // 20초 타임아웃

			// 스티비 뉴스레터 접근을 위한 최적화된 헤더 설정
			const response = await fetch(url.href, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
					'Accept-Encoding': 'gzip, deflate, br',
					Connection: 'keep-alive',
					'Upgrade-Insecure-Requests': '1',
					'Sec-Fetch-Dest': 'document',
					'Sec-Fetch-Mode': 'navigate',
					'Sec-Fetch-Site': 'none',
					'Cache-Control': 'no-cache',
				},
				redirect: 'follow',
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const html = await response.text();
			this.logger.debug(`스티비 HTML 가져오기 성공, 길이: ${html.length}`);

			// DOM 파싱
			const dom = new JSDOM(html);
			const document = dom.window.document;

			// 제목 추출
			const title = this.extractStibeeTitle(document);

			// 콘텐츠 추출 및 최적화
			const content = this.extractAndOptimizeStibeeContent(document);

			return {
				title,
				content,
			};
		} catch (error) {
			this.logger.warn(`스티비 콘텐츠 추출 실패 ${url.href}: ${(error as Error).message}`);
			return {
				title: undefined,
				content: undefined,
			};
		}
	}

	/**
	 * 스티비 뉴스레터에서 제목을 추출합니다.
	 * @param document - DOM 문서
	 * @returns 추출된 제목
	 */
	private extractStibeeTitle(document: Document): string | undefined {
		// 스티비 뉴스레터 제목 추출을 위한 다양한 셀렉터 시도
		const titleSelectors = [
			'meta[property="og:title"]',
			'meta[name="twitter:title"]',
			'title',
			'h1',
			'.newsletter-title',
			'.post-title',
			'[class*="title"]',
			'[class*="headline"]',
		];

		for (const selector of titleSelectors) {
			const element = document.querySelector(selector);
			if (element) {
				let title = element.getAttribute('content') || element.textContent;
				if (title?.trim()) {
					// 스티비 관련 불필요한 텍스트 제거
					title = title.trim();
					title = title.replace(/\s*-\s*스티비$/, '');
					title = title.replace(/\s*\|\s*Stibee$/, '');
					title = title.replace(/\s*::.*$/, '');
					return title.trim();
				}
			}
		}

		return undefined;
	}

	/**
	 * 스티비 뉴스레터 콘텐츠를 추출하고 최적화합니다.
	 * @param document - DOM 문서
	 * @returns 최적화된 HTML 콘텐츠
	 */
	private extractAndOptimizeStibeeContent(document: Document): string | undefined {
		// 스티비 뉴스레터 콘텐츠 추출을 위한 셀렉터들
		const contentSelectors = [
			'article',
			'[class*="content"]',
			'[class*="newsletter"]',
			'[class*="post"]',
			'[class*="body"]',
			'main',
			'.container',
			'#content',
		];

		let contentElement: Element | null = null;

		// 가장 적절한 콘텐츠 컨테이너 찾기
		for (const selector of contentSelectors) {
			const element = document.querySelector(selector);
			if (element && element.textContent && element.textContent.trim().length > 100) {
				contentElement = element;
				break;
			}
		}

		// 콘텐츠 컨테이너를 찾지 못한 경우 body 사용
		if (!contentElement) {
			contentElement = document.body;
		}

		if (!contentElement) {
			return undefined;
		}

		// 콘텐츠 정리 및 최적화
		this.optimizeStibeeContent(contentElement as HTMLElement);

		// 불필요한 요소들 제거
		this.removeUnwantedElements(contentElement as HTMLElement);

		return contentElement.outerHTML;
	}

	/**
	 * 스티비 뉴스레터 콘텐츠를 최적화합니다.
	 * @param element - 최적화할 HTML 요소
	 */
	private optimizeStibeeContent(element: HTMLElement): void {
		// 이미지 최적화
		this.optimizeStibeeImages(element);

		// 링크 최적화
		this.optimizeStibeeLinks(element);

		// 스타일 정리
		this.cleanupStibeeStyles(element);
	}

	/**
	 * 스티비 뉴스레터의 이미지를 최적화합니다.
	 * @param element - 최적화할 요소
	 */
	private optimizeStibeeImages(element: HTMLElement): void {
		const images = element.querySelectorAll('img');

		images.forEach((img) => {
			// data-src 속성을 src로 변환 (lazy loading)
			const dataSrc = img.getAttribute('data-src');
			if (dataSrc && !img.src) {
				img.src = dataSrc;
			}

			// 상대 경로를 절대 경로로 변환
			if (img.src && img.src.startsWith('//')) {
				img.src = 'https:' + img.src;
			}

			// 불필요한 속성 제거
			img.removeAttribute('data-src');
			img.removeAttribute('loading');
			img.removeAttribute('srcset'); // 단순화를 위해 srcset 제거
		});
	}

	/**
	 * 스티비 뉴스레터의 링크를 최적화합니다.
	 * @param element - 최적화할 요소
	 */
	private optimizeStibeeLinks(element: HTMLElement): void {
		const links = element.querySelectorAll('a');

		links.forEach((link) => {
			// 상대 경로를 절대 경로로 변환
			if (link.href && link.href.startsWith('/')) {
				link.href = 'https://stibee.com' + link.href;
			}

			// 새 탭에서 열기 설정
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
		});
	}

	/**
	 * 스티비 뉴스레터의 스타일을 정리합니다.
	 * @param element - 정리할 요소
	 */
	private cleanupStibeeStyles(element: HTMLElement): void {
		// 인라인 스타일 중 불필요한 것들 제거
		const elementsWithStyle = element.querySelectorAll('[style]');

		elementsWithStyle.forEach((el) => {
			const style = el.getAttribute('style');
			if (style) {
				// 폰트 크기와 색상만 유지하고 나머지는 제거
				const keepStyles = style.match(/(font-size|color|background-color):[^;]+;?/g);
				if (keepStyles) {
					el.setAttribute('style', keepStyles.join(' '));
				} else {
					el.removeAttribute('style');
				}
			}
		});
	}

	/**
	 * 불필요한 요소들을 제거합니다.
	 * @param element - 정리할 요소
	 */
	private removeUnwantedElements(element: HTMLElement): void {
		// 제거할 요소들의 셀렉터
		const unwantedSelectors = [
			'script',
			'style',
			'noscript',
			'iframe[src*="tracking"]',
			'iframe[src*="analytics"]',
			'[class*="ad"]',
			'[class*="advertisement"]',
			'[class*="tracking"]',
			'[class*="analytics"]',
			'[id*="tracking"]',
			'[id*="analytics"]',
			'.footer',
			'.header',
			'.navigation',
			'.sidebar',
		];

		unwantedSelectors.forEach((selector) => {
			const elements = element.querySelectorAll(selector);
			elements.forEach((el) => el.remove());
		});
	}
}
