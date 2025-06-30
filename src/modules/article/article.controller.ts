import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
	Request,
	HttpStatus,
	ParseIntPipe,
	DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';

@Controller('articles')
@UseGuards(JwtAuthGuard)
export class ArticleController {
	constructor(private readonly articleService: ArticleService) {}

	/**
	 * 새 Article 생성 (URL 스크래핑)
	 */
	@Post()
	async createArticle(@Body() createArticleDto: CreateArticleDto, @Request() req: any) {
		const article = await this.articleService.createArticle(createArticleDto, req.user.id);
		return {
			status: HttpStatus.CREATED,
			message: '스크래핑이 시작되었습니다',
			data: article,
		};
	}

	/**
	 * 사용자의 Article 목록 조회 (페이지네이션)
	 */
	@Get()
	async getUserArticles(
		@Request() req: any,
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
	) {
		// limit 범위 제한 (1-100)
		const safeLimit = Math.min(Math.max(limit, 1), 100);

		const result = await this.articleService.getUserArticles(req.user.id, page, safeLimit);

		return {
			status: HttpStatus.OK,
			data: result,
		};
	}

	/**
	 * Article 상세 조회
	 */
	@Get(':id')
	async getArticle(@Param('id') id: string, @Request() req: any) {
		const article = await this.articleService.getArticleById(id, req.user.id);
		return {
			status: HttpStatus.OK,
			data: article,
		};
	}

	/**
	 * Article 삭제
	 */
	@Delete(':id')
	async deleteArticle(@Param('id') id: string, @Request() req: any) {
		const result = await this.articleService.deleteArticle(id, req.user.id);
		return {
			status: HttpStatus.OK,
			...result,
		};
	}

	/**
	 * 실패한 스크래핑 재시도
	 */
	@Post(':id/retry')
	async retryArticle(@Param('id') id: string, @Request() req: any) {
		const result = await this.articleService.retryFailedScraping(id, req.user.id);
		return {
			status: HttpStatus.OK,
			...result,
		};
	}

	/**
	 * 사용자의 Article 통계
	 */
	@Get('stats/summary')
	async getArticleStats(@Request() req: any) {
		const stats = await this.articleService.getArticleStats(req.user.id);
		return {
			status: HttpStatus.OK,
			data: stats,
		};
	}

	/**
	 * URL 중복 확인
	 */
	@Post('check-url')
	async checkUrl(@Body() body: { url: string }) {
		const result = await this.articleService.checkUrlExists(body.url);
		return {
			status: HttpStatus.OK,
			data: result,
		};
	}
}
