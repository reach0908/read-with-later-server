import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Article, Prisma } from '@prisma/client';
import { CreateArticleInput } from '../dto/create-article.input';
import { UpdateArticleInput } from '../dto/update-article.input';
import { ListArticlesInput } from '../dto/list-articles.input';

/**
 * Article 데이터베이스 작업을 담당하는 Repository
 */
@Injectable()
export class ArticleRepository {
	private readonly logger = new Logger(ArticleRepository.name);

	constructor(private readonly prisma: PrismaService) {}

	/**
	 * 새로운 Article을 생성합니다.
	 */
	async createArticle(userId: string, input: CreateArticleInput): Promise<Article> {
		const data: Prisma.ArticleCreateInput = {
			url: input.url,
			finalUrl: input.finalUrl,
			title: input.title,
			content: input.content,
			contentType: input.contentType,
			summary: input.summary,
			author: input.author,
			publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
			wordCount: input.wordCount,
			readingTime: input.readingTime,
			tags: input.tags || [],
			isBookmarked: input.isBookmarked || false,
			isArchived: input.isArchived || false,
			user: {
				connect: { id: userId },
			},
		};

		return this.prisma.article.create({
			data,
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
					},
				},
			},
		});
	}

	/**
	 * URL과 사용자 ID로 기존 Article을 찾습니다.
	 */
	async findByUrlAndUserId(url: string, userId: string): Promise<Article | null> {
		return this.prisma.article.findUnique({
			where: {
				url_userId: {
					url,
					userId,
				},
			},
		});
	}

	/**
	 * ID로 Article을 찾습니다.
	 */
	async findById(id: string, userId: string): Promise<Article | null> {
		return this.prisma.article.findFirst({
			where: {
				id,
				userId,
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
					},
				},
			},
		});
	}

	/**
	 * Article을 업데이트합니다.
	 */
	async updateArticle(id: string, userId: string, input: UpdateArticleInput): Promise<Article | null> {
		const data: Prisma.ArticleUpdateInput = {
			title: input.title,
			content: input.content,
			contentType: input.contentType,
			summary: input.summary,
			author: input.author,
			publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
			wordCount: input.wordCount,
			readingTime: input.readingTime,
			tags: input.tags,
			isBookmarked: input.isBookmarked,
			isArchived: input.isArchived,
		};

		// undefined 값들을 제거
		Object.keys(data).forEach((key) => {
			if (data[key as keyof typeof data] === undefined) {
				delete data[key as keyof typeof data];
			}
		});

		try {
			return await this.prisma.article.update({
				where: {
					id_userId: {
						id,
						userId,
					},
				},
				data,
				include: {
					user: {
						select: {
							id: true,
							email: true,
							name: true,
						},
					},
				},
			});
		} catch (error) {
			// Article이 존재하지 않거나 사용자가 소유하지 않은 경우
			this.logger.warn(`Failed to update article ${id} for user ${userId}: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * Article을 삭제합니다.
	 */
	async deleteArticle(id: string, userId: string): Promise<boolean> {
		try {
			await this.prisma.article.delete({
				where: {
					id_userId: {
						id,
						userId,
					},
				},
			});
			return true;
		} catch (error) {
			this.logger.warn(`Failed to delete article ${id} for user ${userId}: ${(error as Error).message}`);
			return false;
		}
	}

	/**
	 * 사용자의 Article 목록을 조회합니다.
	 */
	async findArticlesByUserId(
		userId: string,
		input: ListArticlesInput,
	): Promise<{
		articles: Article[];
		total: number;
	}> {
		const {
			page = 1,
			limit = 20,
			search,
			tags,
			isBookmarked,
			isArchived,
			sortBy = 'createdAt',
			sortOrder = 'desc',
		} = input;

		const skip = (page - 1) * limit;

		// 검색 조건 구성
		const where: Prisma.ArticleWhereInput = {
			userId,
			...(search && {
				OR: [
					{ title: { contains: search, mode: 'insensitive' } },
					{ content: { contains: search, mode: 'insensitive' } },
					{ summary: { contains: search, mode: 'insensitive' } },
				],
			}),
			...(tags &&
				tags.length > 0 && {
					tags: {
						hasSome: tags,
					},
				}),
			...(isBookmarked !== undefined && { isBookmarked }),
			...(isArchived !== undefined && { isArchived }),
		};

		// 정렬 조건 구성 - 타입 안전성 보장
		const orderBy: Prisma.ArticleOrderByWithRelationInput = {
			[sortBy as keyof Prisma.ArticleOrderByWithRelationInput]: sortOrder as Prisma.SortOrder,
		};

		const [articles, total] = await Promise.all([
			this.prisma.article.findMany({
				where,
				orderBy,
				skip,
				take: limit,
				include: {
					user: {
						select: {
							id: true,
							email: true,
							name: true,
						},
					},
				},
			}),
			this.prisma.article.count({ where }),
		]);

		return { articles, total };
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
		const [total, bookmarked, archived, recent] = await Promise.all([
			this.prisma.article.count({ where: { userId } }),
			this.prisma.article.count({ where: { userId, isBookmarked: true } }),
			this.prisma.article.count({ where: { userId, isArchived: true } }),
			this.prisma.article.count({
				where: {
					userId,
					createdAt: {
						gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 최근 7일
					},
				},
			}),
		]);

		return { total, bookmarked, archived, recent };
	}

	/**
	 * 사용자의 모든 태그를 조회합니다.
	 */
	async getUserTags(userId: string): Promise<string[]> {
		const articles = await this.prisma.article.findMany({
			where: { userId },
			select: { tags: true },
		});

		const allTags = articles.flatMap((article) => article.tags);
		return Array.from(new Set(allTags)).sort();
	}

	/**
	 * URL과 사용자 ID로 기존 Article을 업데이트하거나 새로 생성합니다.
	 */
	async upsertArticle(userId: string, input: CreateArticleInput): Promise<Article> {
		const data: Prisma.ArticleCreateInput = {
			url: input.url,
			finalUrl: input.finalUrl,
			title: input.title,
			content: input.content,
			contentType: input.contentType,
			summary: input.summary,
			author: input.author,
			publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
			wordCount: input.wordCount,
			readingTime: input.readingTime,
			tags: input.tags || [],
			isBookmarked: input.isBookmarked || false,
			isArchived: input.isArchived || false,
			user: {
				connect: { id: userId },
			},
		};

		return this.prisma.article.upsert({
			where: {
				url_userId: {
					url: input.url,
					userId,
				},
			},
			create: data,
			update: {
				finalUrl: input.finalUrl,
				title: input.title,
				content: input.content,
				contentType: input.contentType,
				summary: input.summary,
				author: input.author,
				publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
				wordCount: input.wordCount,
				readingTime: input.readingTime,
				tags: input.tags || [],
				// 북마크와 아카이브 상태는 업데이트하지 않음 (사용자가 설정한 값 유지)
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
					},
				},
			},
		});
	}
}
