import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { normalizeUrl } from 'src/common/utils/url-normalizer';
import { ScrapeStatus, ScrapedPage } from '@prisma/client';
import { CrawlerService } from 'src/modules/crawler/crawler.service';
import { ScrapeDto } from '../dto/scrape.dto';

@Injectable()
export class ScrapeService {
	private readonly logger = new Logger(ScrapeService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly crawler: CrawlerService,
	) {}

	async scrapeAndSave({ url, userId }: { url: ScrapeDto['url']; userId: string }): Promise<ScrapedPage> {
		const normalized = normalizeUrl(url);
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
			const crawlResult = await this.crawler.scrapeToMarkdown(normalized);

			// ScrapedPage 모델에는 rawHtml 필드가 없으므로 저장하지 않음
			const data = {
				url: normalized,
				title: crawlResult.title,
				content: crawlResult.content,
				scrapedAt: crawlResult.scrapedAt,
				status: ScrapeStatus.SUCCESS,
			};

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
		} catch (err) {
			// Record failed history
			const errorMsg = err instanceof Error ? err.message : String(err);
			await this.prisma.scrapeHistory.create({
				data: {
					user: { connect: { id: userId } },
					url: normalizeUrl(url),
					status: ScrapeStatus.FAILED,
					duration: Date.now() - start,
					errorMsg,
				},
			});

			this.logger.error(`스크래핑 실패: ${url} - ${errorMsg}`);
			throw new InternalServerErrorException('스크래핑 중 오류가 발생했습니다.');
		}
	}
}
