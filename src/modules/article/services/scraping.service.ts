import { Injectable, Logger } from '@nestjs/common';
import * as playwright from 'playwright';
import type { Browser, Page } from 'playwright';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { ConfigService } from '@nestjs/config';

export interface ScrapedContent {
	title: string;
	content: string;
	textContent: string;
	byline?: string;
	excerpt?: string;
	siteName?: string;
	favicon?: string;
	imageUrl?: string;
	readingTime?: number;
}

interface PageMetadata {
	siteName?: string | null;
	imageUrl?: string | null;
	favicon?: string | null;
}

@Injectable()
export class ScrapingService {
	private readonly logger = new Logger(ScrapingService.name);

	constructor(private configService: ConfigService) {}

	// 현재: 동기 처리, 나중에 큐로 쉽게 전환 가능하도록 설계
	async scrapeUrl(url: string): Promise<ScrapedContent> {
		this.logger.log(`스크래핑 시작: ${url}`);

		try {
			return await this.extractContent(url);
		} catch (error: unknown) {
			this.logger.error(`스크래핑 실패: ${url}`, error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`스크래핑 실패: ${errorMessage}`);
		}
	}

	// 나중에 큐 워커에서 사용할 수 있도록 분리된 메서드
	private async extractContent(url: string): Promise<ScrapedContent> {
		const browser = await this.launchBrowser();

		try {
			const page = await browser.newPage();
			await this.setupPage(page);

			await page.goto(url, {
				waitUntil: 'networkidle',
				timeout: this.configService.get('PUPPETEER_TIMEOUT', 30000),
			});

			const html: string = await page.content();
			const metadata: PageMetadata = await this.extractMetadata(page);

			return this.parseContent(html, url, metadata);
		} finally {
			await browser.close();
		}
	}

	private async launchBrowser(): Promise<Browser> {
		const headless = this.configService.get('PUPPETEER_HEADLESS', 'true') === 'true';
		return playwright.chromium.launch({
			headless,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-web-security',
				'--disable-features=VizDisplayCompositor',
			],
		});
	}

	private async setupPage(page: Page) {
		const userAgent = this.configService.get<string>(
			'SCRAPING_USER_AGENT',
			'Mozilla/5.0 (compatible; ReadWithLater/1.0)',
		);
		await page.setExtraHTTPHeaders({ 'user-agent': userAgent });

		// 불필요한 리소스 차단으로 성능 향상 (playwright는 route 사용)
		await page.route('**/*', (route) => {
			const resourceType = route.request().resourceType();
			if (['stylesheet', 'font', 'image', 'media'].includes(resourceType)) {
				route.abort();
			} else {
				route.continue();
			}
		});
	}

	private async extractMetadata(page: Page): Promise<PageMetadata> {
		const result = await page.evaluate<PageMetadata>(() => {
			const getMetaContent = (name: string) => {
				const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
				return meta?.getAttribute('content') || null;
			};

			const getFaviconUrl = () => {
				const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
				const href = favicon?.getAttribute('href');
				if (!href) return null;

				// 상대 경로를 절대 경로로 변환
				if (href.startsWith('http')) return href;
				if (href.startsWith('//')) return `https:${href}`;
				if (href.startsWith('/')) return `${window.location.origin}${href}`;
				return `${window.location.origin}/${href}`;
			};

			return {
				siteName:
					getMetaContent('og:site_name') ||
					getMetaContent('twitter:site') ||
					document.title.split(' - ').pop()?.trim(),
				imageUrl: getMetaContent('og:image') || getMetaContent('twitter:image'),
				favicon: getFaviconUrl(),
			};
		});

		if (!isPageMetadata(result)) {
			throw new Error('페이지 메타데이터 추출 실패');
		}
		return result;
	}

	private parseContent(html: string, url: string, metadata: PageMetadata): ScrapedContent {
		const dom = new JSDOM(html, { url });
		const article = new Readability(dom.window.document).parse();

		if (!article) {
			throw new Error('본문 추출에 실패했습니다');
		}

		// 독서 시간 계산 (평균 200 단어/분)
		const textContent = article.textContent || '';
		const wordCount = textContent.split(/\s+/).filter((word) => word.length > 0).length;
		const readingTime = Math.max(1, Math.ceil(wordCount / 200));

		// 제목이 없으면 URL에서 추출 시도
		const title = article.title?.trim() || this.extractTitleFromUrl(url);

		return {
			title,
			content: article.content || '',
			textContent,
			byline: article.byline || undefined,
			excerpt: article.excerpt || this.generateExcerpt(textContent),
			siteName: metadata.siteName || undefined,
			imageUrl: metadata.imageUrl || undefined,
			favicon: metadata.favicon || undefined,
			readingTime,
		};
	}

	private extractTitleFromUrl(url: string): string {
		try {
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			const segments = pathname.split('/').filter((s) => s.length > 0);
			const lastSegment = segments[segments.length - 1];

			if (lastSegment && lastSegment !== 'index.html') {
				return lastSegment
					.replace(/\.[^/.]+$/, '') // 확장자 제거
					.replace(/[-_]/g, ' ') // 하이픈, 언더스코어를 공백으로
					.replace(/\b\w/g, (l) => l.toUpperCase()); // 첫 글자 대문자
			}

			return urlObj.hostname;
		} catch {
			return 'Untitled Article';
		}
	}

	private generateExcerpt(textContent: string, maxLength = 200): string {
		if (!textContent) return '';

		const cleaned = textContent
			.replace(/\s+/g, ' ') // 여러 공백을 하나로
			.trim();

		if (cleaned.length <= maxLength) return cleaned;

		const truncated = cleaned.substring(0, maxLength);
		const lastSpace = truncated.lastIndexOf(' ');

		return lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
	}
}

function isPageMetadata(obj: unknown): obj is PageMetadata {
	if (typeof obj === 'object' && obj !== null) {
		const o = obj as Record<string, unknown>;
		return 'siteName' in o || 'imageUrl' in o || 'favicon' in o;
	}
	return false;
}
