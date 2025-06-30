import type { ArticleStatus } from '@prisma/client';

export class ArticleResponseDto {
	id: string;
	url: string;
	title: string;
	content: string;
	textContent: string;
	byline?: string;
	excerpt?: string;
	siteName?: string;
	favicon?: string;
	imageUrl?: string;
	readingTime?: number;
	status: ArticleStatus;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

export class ArticleListResponseDto {
	articles: ArticleResponseDto[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}
