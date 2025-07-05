/**
 * 스티비(Stibee) 뉴스레터 플랫폼을 위한 리팩토링된 콘텐츠 핸들러
 * - AbstractContentHandler 기반
 * - SOLID 원칙 및 함수형 프로그래밍 적용
 */
import { Injectable } from '@nestjs/common';
import { AbstractContentHandler } from '../base/abstract-content-handler';
import {
	HttpRequestConfig,
	DomConfig,
	ContentCleaningConfig,
	TitleExtractionConfig,
} from '../types/content-extraction.types';

/**
 * 스티비 뉴스레터 핸들러
 */
@Injectable()
export class StibeeHandler extends AbstractContentHandler {
	/**
	 * 스티비 도메인 처리 여부
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		return url.hostname.endsWith('stibee.com');
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return '스티비 핸들러';
	}

	/**
	 * HTTP 요청 설정
	 */
	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent:
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			timeout: 20000,
			headers: {
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
			cleanupText: true,
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
				'meta[name="twitter:title"]',
				'title',
				'h1',
				'.newsletter-title',
				'.post-title',
				'[class*="title"]',
				'[class*="headline"]',
			],
			patterns: [/\s*-\s*스티비$/, /\s*\|\s*Stibee$/, /\s*::.*$/],
			siteSpecificPatterns: {
				'stibee.com': [/\s*-\s*스티비$/, /\s*\|\s*Stibee$/],
			},
		};
	}

	/**
	 * 본문 콘텐츠 추출용 셀렉터
	 */
	protected get contentSelectors(): readonly string[] {
		return [
			'article',
			'[class*="content"]',
			'[class*="newsletter"]',
			'[class*="post"]',
			'[class*="body"]',
			'main',
			'.container',
			'#content',
		];
	}
}
