import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { normalizeUrl } from 'src/common/utils/url-normalizer';
import { ScrapeStatus, ScrapedPage } from '@prisma/client';
import { CrawlerService } from 'src/modules/crawler/crawler.service';

@Injectable()
export class ScrapeService {
	private readonly logger = new Logger(ScrapeService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly crawler: CrawlerService,
	) {}

	async scrapeAndSave(originalUrl: string, userId: string, _tags?: string[]): Promise<ScrapedPage> {
		void _tags;
		const normalized = normalizeUrl(originalUrl);
		const start = Date.now();

		try {
			const existing = await this.prisma.scrapedPage.findUnique({
				where: {
					userId_url: {
						userId,
						url: normalized,
					},
				},
			});

			// Crawlee 를 이용하여 페이지 수집
			const crawlResult = await this.crawler.scrapeToMarkdown(originalUrl);

			const data = {
				url: normalized,
				title: crawlResult.title,
				content: crawlResult.content,
				rawHtml: crawlResult.rawHtml,
				scrapedAt: crawlResult.scrapedAt,
				status: ScrapeStatus.SUCCESS,
			} as const;

			let page: ScrapedPage;
			if (existing) {
				page = await this.prisma.scrapedPage.update({
					where: { id: existing.id },
					data,
				});
			} else {
				page = await this.prisma.scrapedPage.create({
					data: {
						...data,
						user: { connect: { id: userId } },
					},
				});
			}

			// Record history
			await this.prisma.scrapeHistory.create({
				data: {
					user: { connect: { id: userId } },
					url: normalized,
					status: ScrapeStatus.SUCCESS,
					duration: Date.now() - start,
				},
			});

			return page;
		} catch (error: unknown) {
			// Record failed history
			await this.prisma.scrapeHistory.create({
				data: {
					user: { connect: { id: userId } },
					url: normalizeUrl(originalUrl),
					status: ScrapeStatus.FAILED,
					duration: Date.now() - start,
					errorMsg: error instanceof Error ? error.message : String(error),
				},
			});

			const msg = error instanceof Error ? error.message : String(error);
			this.logger.error(`스크래핑 실패: ${originalUrl} - ${msg}`);
			throw new InternalServerErrorException('스크래핑 중 오류가 발생했습니다.');
		}
	}
}
