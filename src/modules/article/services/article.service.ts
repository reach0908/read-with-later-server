import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Article } from '@prisma/client';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { ArticleRepository } from '../repositories/article.repository';
import { CreateArticleInput } from '../dto/create-article.input';
import { UpdateArticleInput } from '../dto/update-article.input';
import { ListArticlesInput } from '../dto/list-articles.input';
import { ArticleOutput } from '../dto/article.output';
import { PaginatedArticlesOutput } from '../dto/paginated-articles.output';
import { SaveScrapedContentInput } from '../dto/save-scraped-content.input';
import { ScrapedContentOutput } from '../../scraper/dto/scraped-content.output';

/**
 * Article 비즈니스 로직을 담당하는 Service
 */
@Injectable()
export class ArticleService {
	private readonly logger = new Logger(ArticleService.name);

	constructor(private readonly articleRepository: ArticleRepository) {}

	/**
	 * 새로운 Article을 생성합니다.
	 */
	async createArticle(userId: string, input: CreateArticleInput): Promise<ArticleOutput> {
		try {
			// 중복 체크
			const existing = await this.articleRepository.findByUrlAndUserId(input.url, userId);
			if (existing) {
				throw new BadRequestException('이미 저장된 URL입니다.');
			}

			const article = await this.articleRepository.createArticle(userId, input);
			return this.mapToOutput(article);
		} catch (error) {
			this.logger.error(`Failed to create article for user ${userId}: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * 스크래핑된 콘텐츠를 저장합니다.
	 */
	async saveScrapedContent(
		userId: string,
		scrapedContent: ScrapedContentOutput,
		options: Omit<SaveScrapedContentInput, 'url'> = {},
	): Promise<ArticleOutput> {
		try {
			// (B-3) XSS 방어: DB 저장 전 HTML 살균
			const sanitizedContent = this.sanitizeHtml(scrapedContent.content);

			// 단어 수와 읽기 시간 계산
			const wordCount = this.calculateWordCount(sanitizedContent);
			const readingTime = this.calculateReadingTime(wordCount);

			const articleData: CreateArticleInput = {
				url: scrapedContent.finalUrl, // 원본 URL 대신 최종 URL 사용
				finalUrl: scrapedContent.finalUrl,
				title: scrapedContent.title,
				content: sanitizedContent, // 살균된 콘텐츠 저장
				contentType: scrapedContent.contentType,
				wordCount,
				readingTime,
				tags: options.tags || [],
				isBookmarked: options.isBookmarked || false,
				isArchived: options.isArchived || false,
			};

			// upsert를 사용하여 중복 처리
			const article = await this.articleRepository.upsertArticle(userId, articleData);
			return this.mapToOutput(article);
		} catch (error) {
			this.logger.error(`Failed to save scraped content for user ${userId}: ${(error as Error).message}`);
			throw error;
		}
	}

	/**
	 * Article을 조회합니다.
	 */
	async getArticle(userId: string, articleId: string): Promise<ArticleOutput> {
		const article = await this.articleRepository.findById(articleId, userId);
		if (!article) {
			throw new NotFoundException('Article을 찾을 수 없습니다.');
		}
		return this.mapToOutput(article);
	}

	/**
	 * Article을 업데이트합니다.
	 */
	async updateArticle(userId: string, articleId: string, input: UpdateArticleInput): Promise<ArticleOutput> {
		const article = await this.articleRepository.updateArticle(articleId, userId, input);
		if (!article) {
			throw new NotFoundException('Article을 찾을 수 없습니다.');
		}
		return this.mapToOutput(article);
	}

	/**
	 * Article을 삭제합니다.
	 */
	async deleteArticle(userId: string, articleId: string): Promise<void> {
		const success = await this.articleRepository.deleteArticle(articleId, userId);
		if (!success) {
			throw new NotFoundException('Article을 찾을 수 없습니다.');
		}
	}

	/**
	 * 사용자의 Article 목록을 조회합니다.
	 */
	async getArticles(userId: string, input: ListArticlesInput): Promise<PaginatedArticlesOutput> {
		const { articles, total } = await this.articleRepository.findArticlesByUserId(userId, input);

		const page = input.page || 1;
		const limit = input.limit || 20;
		const totalPages = Math.ceil(total / limit);

		return {
			articles: articles.map((article) => this.mapToOutput(article)),
			total,
			page,
			limit,
			totalPages,
			hasNext: page < totalPages,
			hasPrev: page > 1,
		};
	}

	/**
	 * 사용자의 Article 통계를 조회합니다.
	 */
	async getArticleStats(userId: string): Promise<{
		total: number;
		bookmarked: number;
		archived: number;
		recent: number;
	}> {
		return this.articleRepository.getArticleStats(userId);
	}

	/**
	 * 사용자의 모든 태그를 조회합니다.
	 */
	async getUserTags(userId: string): Promise<string[]> {
		return this.articleRepository.getUserTags(userId);
	}

	/**
	 * Article 북마크 상태를 토글합니다.
	 */
	async toggleBookmark(userId: string, articleId: string): Promise<ArticleOutput> {
		const article = await this.articleRepository.findById(articleId, userId);
		if (!article) {
			throw new NotFoundException('Article을 찾을 수 없습니다.');
		}

		const updated = await this.articleRepository.updateArticle(articleId, userId, {
			isBookmarked: !article.isBookmarked,
		});

		return this.mapToOutput(updated!);
	}

	/**
	 * Article 아카이브 상태를 토글합니다.
	 */
	async toggleArchive(userId: string, articleId: string): Promise<ArticleOutput> {
		const article = await this.articleRepository.findById(articleId, userId);
		if (!article) {
			throw new NotFoundException('Article을 찾을 수 없습니다.');
		}

		const updated = await this.articleRepository.updateArticle(articleId, userId, {
			isArchived: !article.isArchived,
		});

		return this.mapToOutput(updated!);
	}

	/**
	 * URL이 이미 저장되어 있는지 확인합니다.
	 */
	async isUrlAlreadySaved(userId: string, url: string): Promise<boolean> {
		const article = await this.articleRepository.findByUrlAndUserId(url, userId);
		return !!article;
	}

	// ==================== PRIVATE HELPERS ====================

	/**
	 * Sanitize HTML content to prevent XSS attacks.
	 * @param html The HTML content to sanitize.
	 * @returns The sanitized HTML content.
	 */
	private sanitizeHtml(html?: string): string | undefined {
		if (!html) {
			return undefined;
		}
		// JSDOM을 사용하여 서버 사이드에서 DOM 환경을 만듭니다.
		const window = new JSDOM('').window;
		const purify = DOMPurify(window);
		// 기본 설정으로 HTML을 살균합니다.
		return purify.sanitize(html);
	}

	/**
	 * Article 엔티티를 ArticleOutput DTO로 변환합니다.
	 */
	private mapToOutput(article: Article & { user?: { id: string; email: string; name: string } }): ArticleOutput {
		return {
			id: article.id,
			url: article.url,
			finalUrl: article.finalUrl,
			title: article.title ?? undefined,
			content: article.content ?? undefined,
			contentType: article.contentType ?? undefined,
			summary: article.summary ?? undefined,
			author: article.author ?? undefined,
			publishedAt: article.publishedAt ?? undefined,
			wordCount: article.wordCount ?? undefined,
			readingTime: article.readingTime ?? undefined,
			tags: article.tags,
			isBookmarked: article.isBookmarked,
			isArchived: article.isArchived,
			userId: article.userId,
			createdAt: article.createdAt,
			updatedAt: article.updatedAt,
		};
	}

	/**
	 * 콘텐츠의 단어 수를 계산합니다.
	 */
	private calculateWordCount(content?: string): number {
		if (!content) return 0;

		// HTML 태그 제거
		const textContent = content.replace(/<[^>]*>/g, '');

		// 단어 수 계산 (공백 기준)
		const words = textContent.trim().split(/\s+/);
		return words.length > 0 && words[0] !== '' ? words.length : 0;
	}

	/**
	 * 예상 읽기 시간을 계산합니다 (분 단위).
	 */
	private calculateReadingTime(wordCount: number): number {
		// 평균 읽기 속도: 200-250 단어/분
		const wordsPerMinute = 225;
		const minutes = Math.ceil(wordCount / wordsPerMinute);
		return Math.max(1, minutes); // 최소 1분
	}
}
