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
				launchContext: {
					launchOptions: {
						args: [
							'--disable-background-networking',
							'--disable-background-timer-throttling',
							'--disable-renderer-backgrounding',
							'--disable-backgrounding-occluded-windows',
							'--disable-features=TranslateUI',
							'--disable-sync',
							'--no-sandbox',
						],
					},
				},
				requestHandler: async ({ page, request, pushData }) => {
					this.logger.log(`크롤링 시작: ${request.url}`);

					// 불필요한 리소스 차단 (이미지, 폰트, 미디어, 광고, 트래킹)
					await page.route('**/*', (route) => {
						const resourceType = route.request().resourceType();
						const url = route.request().url();

						if (['image', 'font', 'media'].includes(resourceType)) {
							route.abort();
							return;
						}
						if (
							url.includes('google-analytics') ||
							url.includes('googletagmanager') ||
							url.includes('facebook.net') ||
							url.includes('doubleclick') ||
							url.includes('ads') ||
							url.includes('tracking')
						) {
							route.abort();
							return;
						}
						// CSS, JS 등은 유지
						route.continue();
					});

					await page.waitForLoadState('networkidle');

					if (request.url.includes('medium.com')) {
						await page.waitForTimeout(3000);
					}

					const title = await page.title();
					let content = '';

					if (request.url.includes('medium.com')) {
						const articleContent = await page.$('article');
						if (articleContent) {
							const articleHtml = await articleContent.innerHTML();
							content = this.turndown.turndown(articleHtml);
						} else {
							const selectors = [
								'[data-testid="storyContent"]',
								'.story-content',
								'main article',
								'[role="main"]',
							];
							for (const selector of selectors) {
								const element = await page.$(selector);
								if (element) {
									const html = await element.innerHTML();
									content = this.turndown.turndown(html);
									break;
								}
							}
							if (!content) {
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
