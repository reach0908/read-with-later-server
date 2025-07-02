import { Article, ArticleStatus, ScraperType } from '@prisma/client';

export class ArticleResponseDto {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	sourceUrl: string;
	status: ArticleStatus;
	title?: string;
	author?: string;
	excerpt?: string;
	content?: string;
	htmlContent?: string;
	thumbnailUrl?: string;
	scrapedWith?: ScraperType;

	constructor(article: Article) {
		this.id = article.id;
		this.createdAt = article.createdAt;
		this.updatedAt = article.updatedAt;
		this.sourceUrl = article.sourceUrl;
		this.status = article.status;
		this.title = article.title ?? undefined;
		this.author = article.author ?? undefined;
		this.excerpt = article.excerpt ?? undefined;
		this.content = article.content ?? undefined;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		this.htmlContent = (article as any).htmlContent ?? undefined;
		this.thumbnailUrl = article.thumbnailUrl ?? undefined;
		this.scrapedWith = article.scrapedWith ?? undefined;
	}
}

export class ArticleListResponseDto {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	sourceUrl: string;
	status: ArticleStatus;
	title?: string | undefined;
	author?: string | undefined;
	excerpt?: string | undefined;
	thumbnailUrl?: string | undefined;
	scrapedWith?: ScraperType | undefined;

	constructor(article: Article) {
		this.id = article.id;
		this.createdAt = article.createdAt;
		this.updatedAt = article.updatedAt;
		this.sourceUrl = article.sourceUrl;
		this.status = article.status;
		this.title = article.title ?? undefined;
		this.author = article.author ?? undefined;
		this.excerpt = article.excerpt ?? undefined;
		this.thumbnailUrl = article.thumbnailUrl ?? undefined;
		this.scrapedWith = article.scrapedWith ?? undefined;
	}
}
