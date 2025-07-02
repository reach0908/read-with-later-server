import { Injectable } from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { Article, Prisma } from '@prisma/client';

@Injectable()
export class ArticleService {
	constructor(private readonly articleRepository: ArticleRepository) {}

	async createArticle(data: Prisma.ArticleCreateInput): Promise<Article> {
		return this.articleRepository.create(data);
	}

	async updateArticle(id: Article['id'], data: Prisma.ArticleUpdateInput): Promise<Article> {
		return this.articleRepository.update(id, data);
	}

	async findArticleById(id: string): Promise<Article | null> {
		return this.articleRepository.findById(id);
	}

	async findArticleBySourceUrl(sourceUrl: string): Promise<Article | null> {
		return this.articleRepository.findBySourceUrl(sourceUrl);
	}

	async findArticlesByUserId(userId: string): Promise<Article[]> {
		return this.articleRepository.findByUserId(userId);
	}

	async findArticleByUserIdAndArticleId(userId: string, articleId: string): Promise<Article | null> {
		return this.articleRepository.findByUserIdAndArticleId(userId, articleId);
	}
}
