import { Injectable, Logger, InternalServerErrorException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PlaywrightCrawler, Dataset, purgeDefaultStorages } from 'crawlee';
import * as TurndownService from 'turndown';
import crawlerConfig from 'src/config/crawler.config';

export interface CrawlResult {
	title: string;
	content: string;
	rawHtml: string;
	url: string;
	scrapedAt: Date;
}

@Injectable()
export class CrawlerService {
	private readonly logger = new Logger(CrawlerService.name);
	private readonly turndown: TurndownService;

	constructor(
		@Inject(crawlerConfig.KEY)
		private readonly configService: ConfigType<typeof crawlerConfig>,
	) {
		this.turndown = new TurndownService({
			headingStyle: 'atx',
			hr: '---',
			bulletListMarker: '-',
			codeBlockStyle: 'fenced',
			fence: '```',
			emDelimiter: '*',
			strongDelimiter: '**',
			linkStyle: 'inlined',
			linkReferenceStyle: 'full',
		});
		// Medium 특화 규칙 추가
		this.turndown.addRule('mediumContent', {
			filter: function (node) {
				return (
					node.nodeName === 'DIV' &&
					typeof node.className === 'string' &&
					(node.className.includes('medium-content') ||
						node.className.includes('post-content') ||
						node.className.includes('article-content'))
				);
			},
			replacement: function (content) {
				return content;
			},
		});
	}

	async scrapeToMarkdown(url: string): Promise<CrawlResult> {
		if (!url) {
			throw new BadRequestException('URL이 필요합니다.');
		}
		try {
			// 이전 실행 결과가 섞이지 않도록 기본 스토리지를 정리합니다.
			await purgeDefaultStorages();

			const crawler = new PlaywrightCrawler({
				headless: this.configService.HEADLESS,
				maxRequestsPerCrawl: this.configService.MAX_REQUESTS_PER_CRAWL,
				requestHandlerTimeoutSecs: this.configService.REQUEST_HANDLER_TIMEOUT_SECS,
				// 성능 최적화 설정 추가
				browserPoolOptions: {
					useFingerprints: false, // 핑거프린팅 비활성화
				},
				launchContext: {
					launchOptions: {
						args: [
							'--disable-images', // 이미지 비활성화
							'--disable-javascript', // JavaScript 비활성화 (필요시)
							'--disable-plugins',
							'--disable-extensions',
							'--no-sandbox',
							'--disable-setuid-sandbox',
						],
					},
				},
				requestHandler: async ({ page, request, pushData }) => {
					this.logger.log(`크롤링 시작: ${request.url}`);

					// Medium 최적화
					if (request.url.includes('medium.com')) {
						// 불필요한 리소스 차단
						await page.route('**/*.{png,jpg,jpeg,gif,svg,webp}', (route) => route.abort());
						await page.route('**/*.{css,woff,woff2}', (route) => route.abort());

						// 빠른 로딩을 위한 설정
						await page.setViewportSize({ width: 1200, height: 800 });
					}

					await page.waitForLoadState('domcontentloaded'); // networkidle 대신 더 빠른 옵션

					if (request.url.includes('medium.com')) {
						await page.waitForTimeout(this.configService.MEDIUM_WAIT_TIME || 3000);
					}

					const title = await page.title();
					let content = '';
					if (request.url.includes('medium.com')) {
						const articleContent = await page.$('article');
						if (articleContent) {
							const articleHtml = await articleContent.innerHTML();
							content = this.turndown.turndown(articleHtml);
						} else {
							const mainContent = await page.$('main, [role="main"], .post-content, .article-content');
							if (mainContent) {
								const mainHtml = await mainContent.innerHTML();
								content = this.turndown.turndown(mainHtml);
							} else {
								const bodyHtml = await page.$eval('body', (el) => el.innerHTML);
								content = this.turndown.turndown(bodyHtml);
							}
						}
					} else {
						const rawHtml = await page.content();
						content = this.turndown.turndown(rawHtml);
					}
					const rawHtml = await page.content();
					await pushData({
						title,
						rawHtml,
						content,
						url: request.url,
						scrapedAt: new Date(),
					});
				},
			});

			await crawler.run([url]);
			const dataset = await Dataset.open<CrawlResult>();
			const { items } = await dataset.getData();
			await dataset.drop();

			if (!items[0]) {
				throw new InternalServerErrorException('크롤링 결과가 없습니다.');
			}

			return items[0];
		} catch (error) {
			this.logger.error(`크롤링 실패: ${url}`, error instanceof Error ? error.stack : String(error));
			throw new InternalServerErrorException('크롤링 중 오류가 발생했습니다.');
		}
	}
}
