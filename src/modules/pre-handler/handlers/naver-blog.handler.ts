import { Injectable } from '@nestjs/common';
import { AbstractContentHandler } from '../base/abstract-content-handler';
import {
	HttpRequestConfig,
	DomConfig,
	ContentCleaningConfig,
	TitleExtractionConfig,
} from '../types/content-extraction.types';
import { PreHandleResult } from '../dto/pre-handle-result.dto';
import { JSDOM } from 'jsdom';
import { postProcessDom } from '../utils/content-cleaning-pipeline';

/**
 * 네이버 블로그 전용 핸들러
 * - SOLID 원칙 기반, AbstractContentHandler 상속
 */
@Injectable()
export class NaverBlogHandler extends AbstractContentHandler {
	public canHandle(url: URL): boolean {
		return url.hostname.endsWith('blog.naver.com');
	}

	protected get handlerName(): string {
		return '네이버블로그 핸들러';
	}

	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent:
				'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
			timeout: 15000,
			headers: {
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
				'Accept-Encoding': 'gzip, deflate',
				Connection: 'keep-alive',
				Referer: 'https://blog.naver.com/',
			},
			redirect: 'follow',
		};
	}

	protected get domConfig(): DomConfig {
		return {
			userAgent: this.httpConfig.userAgent,
			resources: 'usable',
			runScripts: 'outside-only',
			pretendToBeVisual: true,
		};
	}

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

	protected get titleConfig(): TitleExtractionConfig {
		return {
			selectors: [
				'meta[property="og:title"]',
				'meta[name="title"]',
				'title',
				'.se-title-text',
				'.pcol1 .title',
				'.blog-title',
			],
			patterns: [],
			siteSpecificPatterns: {},
		};
	}

	protected get contentSelectors(): readonly string[] {
		return [
			'#postViewArea',
			'.se-main-container',
			'.post-view',
			'.se_component_wrap',
			'.se_textView',
			'.blog2_container',
			'.se_content',
			'.view',
			'.post',
		];
	}

	/**
	 * 네이버 블로그 콘텐츠를 처리하여 후처리된 결과를 반환합니다.
	 * @param url 처리할 URL
	 * @returns 후처리된 PreHandleResult 또는 null
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		const result = await super.handle(url);
		if (!result || !result.content) return result;
		const dom = new JSDOM(result.content);
		const document = dom.window.document;
		postProcessDom(document, { baseUrl: 'https://blog.naver.com' });
		return {
			...result,
			content: document.body?.outerHTML ?? result.content,
		};
	}
}
