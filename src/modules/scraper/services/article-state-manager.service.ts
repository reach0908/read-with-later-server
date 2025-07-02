import { Injectable } from '@nestjs/common';
import { Article, ArticleStatus, ScraperType } from '@prisma/client';
import { ArticleService } from 'src/modules/article/article.service';
import { ArticleStateManager } from '../interfaces/article-state-manager.interface';
import { ScrapedContent } from '../interfaces/scraping-strategy.interface';

@Injectable()
export class ArticleStateManagerService implements ArticleStateManager {
	constructor(private readonly articleService: ArticleService) {}

	async createProcessing(url: string): Promise<Article> {
		return this.articleService.createArticle({
			sourceUrl: url,
			status: ArticleStatus.PROCESSING,
		});
	}

	async markCompleted(id: string, data: ScrapedContent & { scrapedWith: string }): Promise<Article> {
		return this.articleService.updateArticle(id, {
			...data,
			status: ArticleStatus.COMPLETED,
			scrapedWith: data.scrapedWith as ScraperType,
		});
	}

	async markFailed(id: string, reason: string): Promise<Article> {
		return this.articleService.updateArticle(id, {
			status: ArticleStatus.FAILED,
			failureReason: reason,
		});
	}
}
