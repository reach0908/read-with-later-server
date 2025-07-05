/**
 * 뉴스 사이트용 리팩토링된 콘텐츠 핸들러
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

/**
 * News site transformations.
 * Each news site has specific URL patterns and optimal access methods.
 */
const NEWS_SITE_TRANSFORMATIONS: Record<string, (url: URL) => URL> = {
	'nytimes.com': (url) => {
		// New York Times: Use print version to bypass paywall
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'wsj.com': (url) => {
		// Wall Street Journal: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'washingtonpost.com': (url) => {
		// Washington Post: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'ft.com': (url) => {
		// Financial Times: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'bloomberg.com': (url) => {
		// Bloomberg: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'economist.com': (url) => {
		// The Economist: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'cnn.com': (url) => {
		// CNN: Use mobile version for cleaner layout
		const newUrl = new URL(url.href);
		newUrl.hostname = 'lite.cnn.com';
		return newUrl;
	},
	'bbc.com': (url) => {
		// BBC: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.bbc.com';
		return newUrl;
	},
	'bbc.co.uk': (url) => {
		// BBC UK: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.bbc.co.uk';
		return newUrl;
	},
	'reuters.com': (url) => {
		// Reuters: Keep original, usually accessible
		return url;
	},
	'apnews.com': (url) => {
		// Associated Press: Keep original, usually accessible
		return url;
	},
	'theguardian.com': (url) => {
		// The Guardian: Keep original, no paywall
		return url;
	},
	'npr.org': (url) => {
		// NPR: Keep original, usually accessible
		return url;
	},
	'politico.com': (url) => {
		// Politico: Use print version for better readability
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'axios.com': (url) => {
		// Axios: Keep original, usually accessible
		return url;
	},
	'vox.com': (url) => {
		// Vox: Keep original, usually accessible
		return url;
	},
	'buzzfeed.com': (url) => {
		// BuzzFeed: Keep original
		return url;
	},
	'huffpost.com': (url) => {
		// HuffPost: Keep original
		return url;
	},
	'usatoday.com': (url) => {
		// USA Today: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'latimes.com': (url) => {
		// LA Times: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'chicagotribune.com': (url) => {
		// Chicago Tribune: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'time.com': (url) => {
		// Time Magazine: Keep original
		return url;
	},
	'newsweek.com': (url) => {
		// Newsweek: Keep original
		return url;
	},
	'theatlantic.com': (url) => {
		// The Atlantic: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'newyorker.com': (url) => {
		// The New Yorker: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'forbes.com': (url) => {
		// Forbes: Keep original but remove tracking
		const newUrl = new URL(url.href);
		newUrl.searchParams.delete('sh');
		return newUrl;
	},
	'techcrunch.com': (url) => {
		// TechCrunch: Keep original
		return url;
	},
	'engadget.com': (url) => {
		// Engadget: Keep original
		return url;
	},
	'theverge.com': (url) => {
		// The Verge: Keep original
		return url;
	},
	'wired.com': (url) => {
		// Wired: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'arstechnica.com': (url) => {
		// Ars Technica: Keep original, usually accessible
		return url;
	},
	'espn.com': (url) => {
		// ESPN: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.espn.com';
		return newUrl;
	},
	'cbssports.com': (url) => {
		// CBS Sports: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.cbssports.com';
		return newUrl;
	},
	'nfl.com': (url) => {
		// NFL: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.nfl.com';
		return newUrl;
	},
	'nba.com': (url) => {
		// NBA: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.nba.com';
		return newUrl;
	},
};

/**
 * 뉴스 사이트 핸들러
 */
@Injectable()
export class NewsSiteHandler extends AbstractContentHandler {
	protected readonly logger = new Logger(NewsSiteHandler.name);

	/**
	 * 뉴스 사이트 처리 여부
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		return Object.keys(NEWS_SITE_TRANSFORMATIONS).some((domain) => url.hostname.endsWith(domain));
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return '뉴스사이트 핸들러';
	}

	/**
	 * HTTP 요청 설정 (뉴스사이트는 표준 설정)
	 */
	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent: '',
			timeout: 10000,
			headers: {},
			redirect: 'follow',
		};
	}

	/**
	 * DOM 생성 설정 (표준)
	 */
	protected get domConfig(): DomConfig {
		return {
			userAgent: '',
			resources: 'usable',
			runScripts: 'outside-only',
			pretendToBeVisual: true,
		};
	}

	/**
	 * 콘텐츠 정제 설정 (뉴스사이트용)
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
	 * 제목 추출 설정 (뉴스사이트용)
	 */
	protected get titleConfig(): TitleExtractionConfig {
		return {
			selectors: ['meta[property="og:title"]', 'title', 'h1'],
			patterns: [/[-_][^\s]+/g],
			siteSpecificPatterns: {},
		};
	}

	/**
	 * 본문 콘텐츠 추출용 셀렉터 (뉴스사이트용)
	 */
	protected get contentSelectors(): readonly string[] {
		return ['article', 'main', '.article-body', '.content', '#article-body'];
	}

	/**
	 * 뉴스사이트는 URL 변환 후 표준 추출 프로세스 사용
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			const transformedUrl = this.transformUrl(url);
			return await super.handle(transformedUrl);
		} catch (error) {
			this.logger.warn(`NewsSiteHandler failed for ${url.href}: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * 도메인별 URL 변환
	 * @param url 원본 URL
	 */
	private transformUrl(url: URL): URL {
		const domain = Object.keys(NEWS_SITE_TRANSFORMATIONS).find((d) => url.hostname.endsWith(d));
		if (domain) {
			return NEWS_SITE_TRANSFORMATIONS[domain](url);
		}
		return url;
	}

	/**
	 * Gets a human-readable site name from domain.
	 * @param domain - The domain name.
	 * @returns The site name.
	 */
	private getSiteName(domain: string): string {
		const siteNames: Record<string, string> = {
			'nytimes.com': 'New York Times',
			'wsj.com': 'Wall Street Journal',
			'washingtonpost.com': 'Washington Post',
			'ft.com': 'Financial Times',
			'bloomberg.com': 'Bloomberg',
			'economist.com': 'The Economist',
			'cnn.com': 'CNN',
			'bbc.com': 'BBC',
			'bbc.co.uk': 'BBC',
			'reuters.com': 'Reuters',
			'apnews.com': 'Associated Press',
			'theguardian.com': 'The Guardian',
			'npr.org': 'NPR',
			'politico.com': 'Politico',
			'axios.com': 'Axios',
			'vox.com': 'Vox',
			'buzzfeed.com': 'BuzzFeed',
			'huffpost.com': 'HuffPost',
			'usatoday.com': 'USA Today',
			'latimes.com': 'LA Times',
			'chicagotribune.com': 'Chicago Tribune',
			'time.com': 'Time',
			'newsweek.com': 'Newsweek',
			'theatlantic.com': 'The Atlantic',
			'newyorker.com': 'The New Yorker',
			'forbes.com': 'Forbes',
			'techcrunch.com': 'TechCrunch',
			'engadget.com': 'Engadget',
			'theverge.com': 'The Verge',
			'wired.com': 'Wired',
			'arstechnica.com': 'Ars Technica',
			'espn.com': 'ESPN',
			'cbssports.com': 'CBS Sports',
			'nfl.com': 'NFL',
			'nba.com': 'NBA',
		};

		return siteNames[domain] || domain;
	}
}
