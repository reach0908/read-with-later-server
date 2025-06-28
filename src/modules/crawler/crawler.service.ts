import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightCrawler, Dataset, purgeDefaultStorages } from 'crawlee';
import TurndownService from 'turndown';

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
	private readonly turndown = new TurndownService({ headingStyle: 'atx' });

	async scrapeToMarkdown(url: string): Promise<CrawlResult> {
		// 이전 실행 결과가 섞이지 않도록 기본 스토리지를 정리합니다.
		await purgeDefaultStorages();

		const crawler = new PlaywrightCrawler({
			headless: true,
			maxRequestsPerCrawl: 1,
			requestHandlerTimeoutSecs: 30,
			// requestHandler 정의
			requestHandler: async ({ page, request, pushData }) => {
				this.logger.log(`크롤링 시작: ${request.url}`);
				const title = await page.title();
				const rawHtml = await page.content();
				const content = this.turndown.turndown(rawHtml);

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
		// 기본 Dataset 에 저장된 결과 조회
		const dataset = await Dataset.open<CrawlResult>();
		const { items } = await dataset.getData();
		// 사용 후 데이터셋 정리
		await dataset.drop();

		if (!items[0]) {
			throw new Error('크롤링 결과가 없습니다.');
		}

		return items[0];
	}
}
