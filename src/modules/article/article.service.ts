import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { ScrapingService } from './services/scraping.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleStatus } from '@prisma/client';

@Injectable()
export class ArticleService {
	private readonly logger = new Logger(ArticleService.name);

	constructor(
		private prisma: PrismaService,
		private scrapingService: ScrapingService,
	) {}

	async createArticle(createArticleDto: CreateArticleDto, userId: string) {
		const { url } = createArticleDto;

		// 이미 존재하는 URL 확인 (같은 유저가 같은 URL을 중복 저장하는 것 방지)
		const existingArticle = await this.prisma.article.findFirst({
			where: { url, userId },
		});

		if (existingArticle) {
			throw new ConflictException('이미 저장된 URL입니다');
		}

		// 1. 먼저 PENDING 상태로 레코드 생성
		const article = await this.prisma.article.create({
			data: {
				url,
				title: 'Loading...',
				content: '',
				textContent: '',
				status: ArticleStatus.PENDING,
				userId,
			},
		});

		// 2. 백그라운드에서 스크래핑 실행 (나중에 큐로 전환 예정)
		this.processArticleInBackground(article.id, url);

		return article;
	}

	// 현재: 백그라운드 처리, 나중에 큐 작업으로 전환
	private async processArticleInBackground(articleId: string, url: string) {
		try {
			// 상태를 PROCESSING으로 변경
			await this.prisma.article.update({
				where: { id: articleId },
				data: { status: ArticleStatus.PROCESSING },
			});

			this.logger.log(`스크래핑 시작: ${articleId} - ${url}`);

			// 스크래핑 실행
			const scrapedContent = await this.scrapingService.scrapeUrl(url);

			// 성공 시 데이터 업데이트
			await this.prisma.article.update({
				where: { id: articleId },
				data: {
					...scrapedContent,
					status: ArticleStatus.COMPLETED,
				},
			});

			this.logger.log(`스크래핑 완료: ${articleId} - ${url}`);
		} catch (error) {
			this.logger.error(`스크래핑 실패: ${articleId} - ${url}`, error);

			const errorMessage = error instanceof Error ? error.message : '스크래핑 중 오류가 발생했습니다';

			// 실패 시 상태 업데이트
			await this.prisma.article.update({
				where: { id: articleId },
				data: {
					status: ArticleStatus.FAILED,
					content: `<div style="color: #dc3545; padding: 20px; text-align: center;">
            <h3>스크래핑 실패</h3>
            <p>${errorMessage}</p>
            <p><small>나중에 다시 시도할 수 있습니다.</small></p>
          </div>`,
					textContent: `스크래핑 실패: ${errorMessage}`,
					title: 'Failed to Load',
				},
			});
		}
	}

	async getUserArticles(userId: string, page = 1, limit = 20) {
		const skip = (page - 1) * limit;

		const [articles, total] = await Promise.all([
			this.prisma.article.findMany({
				where: { userId },
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit,
				select: {
					id: true,
					url: true,
					title: true,
					excerpt: true,
					siteName: true,
					favicon: true,
					imageUrl: true,
					readingTime: true,
					status: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
			this.prisma.article.count({ where: { userId } }),
		]);

		return {
			articles,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
				hasNext: page * limit < total,
				hasPrev: page > 1,
			},
		};
	}

	async getArticleById(id: string, userId: string) {
		const article = await this.prisma.article.findFirst({
			where: { id, userId },
		});

		if (!article) {
			throw new NotFoundException('Article을 찾을 수 없습니다');
		}

		return article;
	}

	async deleteArticle(id: string, userId: string) {
		const article = await this.getArticleById(id, userId);

		await this.prisma.article.delete({
			where: { id: article.id },
		});

		return { message: 'Article이 삭제되었습니다' };
	}

	// 실패한 스크래핑 재시도
	async retryFailedScraping(id: string, userId: string) {
		const article = await this.getArticleById(id, userId);

		if (article.status !== ArticleStatus.FAILED) {
			throw new ConflictException('재시도는 실패한 상태의 글에서만 가능합니다');
		}

		// 백그라운드에서 재처리
		this.processArticleInBackground(article.id, article.url);

		return {
			message: '재시도가 시작되었습니다',
			articleId: article.id,
		};
	}

	// 스크래핑 상태별 통계
	async getArticleStats(userId: string) {
		const stats = await this.prisma.article.groupBy({
			by: ['status'],
			where: { userId },
			_count: {
				id: true,
			},
		});

		const result = {
			total: 0,
			completed: 0,
			pending: 0,
			processing: 0,
			failed: 0,
		};

		stats.forEach((stat) => {
			result.total += stat._count.id;
			result[stat.status.toLowerCase() as keyof typeof result] = stat._count.id;
		});

		return result;
	}

	// URL로 중복 확인 (다른 유저들이 저장한 경우도 포함)
	async checkUrlExists(url: string) {
		const count = await this.prisma.article.count({
			where: { url },
		});

		return {
			exists: count > 0,
			count,
			message: count > 0 ? `${count}명의 사용자가 이미 저장한 URL입니다` : '새로운 URL입니다',
		};
	}
}
