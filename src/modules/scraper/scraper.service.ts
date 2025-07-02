import { Injectable, Logger, Inject } from '@nestjs/common';
import { Article } from '@prisma/client';
import { ScrapingStrategyFactory } from './factories/scraping-strategy.factory';
import { ArticleStateManager } from './interfaces/article-state-manager.interface';
import { ScrapedContent } from './interfaces/scraping-strategy.interface';
import { ARTICLE_STATE_MANAGER_TOKEN } from './constants/injection.tokens';

@Injectable()
export class ScraperService {
	private readonly logger = new Logger(ScraperService.name);

	constructor(
		private readonly scrapingStrategyFactory: ScrapingStrategyFactory,
		@Inject(ARTICLE_STATE_MANAGER_TOKEN)
		private readonly articleStateManager: ArticleStateManager,
	) {}

	async scrapeAndSave(url: string, userId: string): Promise<Article> {
		// 1. DB에 초기 레코드 생성 (상태: PROCESSING)
		const articleRecord = await this.articleStateManager.createProcessing(url, userId);

		try {
			// 2. 하이브리드 스크래핑 실행
			const scrapedData = await this.executeScrapingStrategies(url);

			// 3. 성공 시 DB 업데이트 (상태: COMPLETED)
			return await this.articleStateManager.markCompleted(articleRecord.id, scrapedData);
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Scraping failed for ${url}: ${err.message}`);

			// 4. 실패 시 DB 업데이트 (상태: FAILED)
			await this.articleStateManager.markFailed(articleRecord.id, err.message);
			throw err;
		}
	}

	private async executeScrapingStrategies(url: string): Promise<ScrapedContent & { scrapedWith: string }> {
		const strategies = this.scrapingStrategyFactory.getStrategies();

		if (strategies.length === 0) {
			throw new Error('No scraping strategies available');
		}

		let lastError: Error | null = null;

		for (const strategy of strategies) {
			try {
				this.logger.debug(`Attempting scraping with strategy: ${strategy.getStrategyName()}`);

				const scrapedContent = await strategy.scrape(url);

				this.logger.log(`Successfully scraped ${url} with strategy: ${strategy.getStrategyName()}`);

				return {
					...scrapedContent,
					scrapedWith: strategy.getStrategyName(),
				};
			} catch (error) {
				const err = error as Error;
				lastError = err;
				this.logger.warn(`Strategy ${strategy.getStrategyName()} failed for ${url}: ${err.message}`);
				// 다음 전략으로 계속 진행
			}
		}

		// 모든 전략이 실패한 경우
		const errorMessage = lastError
			? `All scraping strategies failed. Last error: ${lastError.message}`
			: 'All scraping strategies failed with unknown errors';

		throw new Error(errorMessage);
	}
}
