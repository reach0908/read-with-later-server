/**
 * RSS/Atom 피드용 리팩토링된 콘텐츠 핸들러
 * - AbstractContentHandler 기반
 * - SOLID 원칙 및 함수형 프로그래밍 적용
 */
import { Injectable, Logger } from '@nestjs/common';
import { AbstractContentHandler } from '../base/abstract-content-handler';
import {
	HttpRequestConfig,
	DomConfig,
	ContentCleaningConfig,
	TitleExtractionConfig,
} from '../types/content-extraction.types';
import { PreHandleResult } from '../dto/pre-handle-result.dto';
import { extractTitleFromPath } from '../utils/functional-utils';

/**
 * RSS/Atom 피드 핸들러
 */
@Injectable()
export class RssHandler extends AbstractContentHandler {
	protected readonly logger = new Logger(RssHandler.name);

	/**
	 * RSS/Atom 피드 처리 여부
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		const feedExtensions = ['.rss', '.xml', '.atom'];
		if (feedExtensions.some((ext) => url.pathname.toLowerCase().endsWith(ext))) {
			return true;
		}
		const feedPatterns = [
			/\/feed\/?$/i,
			/\/feeds?\//i,
			/\/rss\/?$/i,
			/\/atom\/?$/i,
			/\/syndication\//i,
			/\/index\.xml$/i,
			/\/rss\.xml$/i,
			/\/atom\.xml$/i,
			/\/feed\.xml$/i,
		];
		return feedPatterns.some((pattern) => pattern.test(url.pathname));
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return 'RSS 핸들러';
	}

	/**
	 * HTTP 요청 설정 (피드는 별도 요청 불필요)
	 */
	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent: '',
			timeout: 0,
			headers: {},
			redirect: 'follow',
		};
	}

	/**
	 * DOM 생성 설정 (피드는 사용하지 않음)
	 */
	protected get domConfig(): DomConfig {
		return {
			userAgent: '',
			resources: 'usable',
			runScripts: 'outside-only',
			pretendToBeVisual: false,
		};
	}

	/**
	 * 콘텐츠 정제 설정 (피드는 정제 불필요)
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
	 * 제목 추출 설정 (URL/도메인 기반)
	 */
	protected get titleConfig(): TitleExtractionConfig {
		return {
			selectors: [],
			patterns: [/[-_]/g],
			siteSpecificPatterns: {},
		};
	}

	/**
	 * 본문 콘텐츠 추출용 셀렉터 (사용하지 않음)
	 */
	protected get contentSelectors(): readonly string[] {
		return [];
	}

	/**
	 * RSS/Atom 피드는 본문 추출 없이 타입 마킹만 수행
	 * @param url 처리할 URL
	 * @returns PreHandleResult 또는 null
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			let title: string | undefined;
			const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
			if (pathParts.length > 0) {
				const lastPart = pathParts[pathParts.length - 1];
				if (
					!['feed', 'rss', 'atom', 'index.xml', 'rss.xml', 'atom.xml', 'feed.xml'].includes(
						lastPart.toLowerCase(),
					)
				) {
					title = extractTitleFromPath(lastPart);
				}
			}
			if (!title) {
				title = `${url.hostname} Feed`;
			}
			let contentType = 'application/rss+xml';
			if (url.pathname.toLowerCase().includes('atom')) {
				contentType = 'application/atom+xml';
			}
			return {
				url: url.href,
				title,
				contentType,
			};
		} catch (error) {
			this.logger.warn(`RssHandler failed for ${url.href}: ${(error as Error).message}`);
			return null;
		}
	}
}
