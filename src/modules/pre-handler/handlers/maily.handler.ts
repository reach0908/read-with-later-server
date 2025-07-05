/**
 * 메일리(Maily) 뉴스레터 플랫폼을 위한 리팩토링된 콘텐츠 핸들러
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
 * 메일리 뉴스레터 핸들러
 */
@Injectable()
export class MailyHandler extends AbstractContentHandler {
	/**
	 * 메일리 도메인 처리 여부
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		return url.hostname.endsWith('maily.so');
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return '메일리 핸들러';
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
				'X-Requested-With': 'XMLHttpRequest',
				Origin: 'https://maily.so',
				Referer: 'https://maily.so/',
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
				'.article-title',
				'[class*="title"]',
				'[class*="headline"]',
				'[data-testid="post-title"]',
				'[data-testid="article-title"]',
				'[class*="maily-title"]',
				'[class*="letter-title"]',
				'article h1',
				'main h1',
			],
			patterns: [
				/\s*-\s*메일리$/,
				/\s*\|\s*Maily$/,
				/\s*::.*$/,
				/\s*·\s*메일리$/,
				/\s*뉴스레터를 쉽게, 메일리로 시작하세요$/,
			],
			siteSpecificPatterns: {
				'maily.so': [/\s*-\s*메일리$/, /\s*\|\s*Maily$/, /\s*뉴스레터를 쉽게, 메일리로 시작하세요$/],
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
			'[class*="letter"]',
			'[data-testid="post-content"]',
			'[data-testid="article-content"]',
			'main',
			'.container',
			'#content',
			'[class*="maily-content"]',
			'[class*="letter-content"]',
			'[class*="newsletter-content"]',
			'.post-content',
			'.article-content',
		];
	}
}
