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
 * Medium 전용 핸들러
 * - SOLID 원칙 기반, AbstractContentHandler 상속
 */
@Injectable()
export class MediumHandler extends AbstractContentHandler {
	public canHandle(url: URL): boolean {
		return url.hostname.endsWith('medium.com');
	}

	protected get handlerName(): string {
		return 'Medium 핸들러';
	}

	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent:
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			timeout: 15000,
			headers: {
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate',
				Connection: 'keep-alive',
				'Cache-Control': 'no-cache',
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
			selectors: ['meta[property="og:title"]', 'meta[name="title"]', 'title', 'h1'],
			patterns: [],
			siteSpecificPatterns: {},
		};
	}

	protected get contentSelectors(): readonly string[] {
		return ['article', '.section-content', '.postArticle-content', '.meteredContent', '.main-content'];
	}

	/**
	 * Medium 콘텐츠를 처리하여 후처리된 결과를 반환합니다.
	 * @param url 처리할 URL
	 * @returns 후처리된 PreHandleResult 또는 null
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		const result = await super.handle(url);
		if (!result || !result.content) return result;
		const dom = new JSDOM(result.content);
		const document = dom.window.document;
		postProcessDom(document);
		return {
			...result,
			content: document.body?.outerHTML ?? result.content,
		};
	}
}
