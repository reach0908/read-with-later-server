import { Injectable } from '@nestjs/common';
import { AbstractContentHandler } from '../base/abstract-content-handler';
import {
	HttpRequestConfig,
	DomConfig,
	ContentCleaningConfig,
	TitleExtractionConfig,
} from '../types/content-extraction.types';
import { JSDOM } from 'jsdom';
import { postProcessDom } from '../utils/content-cleaning-pipeline';

/**
 * 티스토리 블로그 전용 핸들러
 * - SOLID 원칙 기반, AbstractContentHandler 상속
 */
@Injectable()
export class TistoryHandler extends AbstractContentHandler {
	/**
	 * 처리 가능한 도메인 여부
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		return url.hostname.endsWith('tistory.com');
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return '티스토리 핸들러';
	}

	/**
	 * HTTP 요청 설정
	 */
	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent:
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			timeout: 15000,
			headers: {
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
				'Accept-Encoding': 'gzip, deflate',
				Connection: 'keep-alive',
				'Cache-Control': 'no-cache',
			},
			redirect: 'follow',
		};
	}

	/**
	 * DOM 생성 설정
	 */
	protected get domConfig(): DomConfig {
		return {
			userAgent: this.httpConfig.userAgent,
			resources: 'usable',
			runScripts: 'outside-only',
			pretendToBeVisual: true,
		};
	}

	/**
	 * 콘텐츠 정제 설정
	 */
	protected get cleaningConfig(): ContentCleaningConfig {
		return {
			removeUnwantedElements: true,
			cleanupStyles: true,
			cleanupLinks: true,
			cleanupImages: true,
			cleanupText: false,
			refineTitle: true,
		};
	}

	/**
	 * 제목 추출 설정
	 */
	protected get titleConfig(): TitleExtractionConfig {
		return {
			selectors: [
				'meta[property="og:title"]',
				'meta[name="title"]',
				'title',
				'.titleWrap h2',
				'.titleWrap h3',
				'.entry-title',
				'.post-title',
				'.article-title',
				'.content-title',
			],
			patterns: [],
			siteSpecificPatterns: {},
		};
	}

	/**
	 * 본문 콘텐츠 추출용 셀렉터
	 */
	protected get contentSelectors(): readonly string[] {
		return [
			'#content',
			'.tt_article_useless_p_margin',
			'.article-view',
			'.entry-content',
			'.post-content',
			'.article',
			'.content',
			'#article',
			'#tt-body-page',
			'.tt_article',
		];
	}

	/**
	 * 티스토리 콘텐츠에 특화된 후처리 로직을 적용합니다.
	 * @param content 추출된 HTML 콘텐츠
	 * @returns 후처리된 HTML 콘텐츠
	 */
	protected override postProcess(content: string): string {
		if (!content) {
			return content;
		}
		const dom = new JSDOM(content);
		const document = dom.window.document;
		postProcessDom(document, { baseUrl: 'https://tistory.com' });
		return document.body?.outerHTML ?? content;
	}
}
