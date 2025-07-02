import { Article } from '@prisma/client';
import { ScrapedContent } from './scraping-strategy.interface';

export interface ArticleStateManager {
	createProcessing(url: string, userId: string): Promise<Article>;
	markCompleted(id: string, data: ScrapedContent & { scrapedWith: string }): Promise<Article>;
	markFailed(id: string, reason: string): Promise<Article>;
}
