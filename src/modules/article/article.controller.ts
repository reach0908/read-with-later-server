import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
	Request,
	HttpCode,
	HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { ArticleService } from './services/article.service';
import { CreateArticleInput } from './dto/create-article.input';
import { UpdateArticleInput } from './dto/update-article.input';
import { ListArticlesInput } from './dto/list-articles.input';
import { ArticleOutput } from './dto/article.output';
import { PaginatedArticlesOutput } from './dto/paginated-articles.output';
interface AuthenticatedRequest extends Request {
	user: {
		id: string;
		email: string;
	};
}

@ApiTags('articles')
@Controller('articles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ArticleController {
	constructor(private readonly articleService: ArticleService) {}

	/**
	 * 새로운 Article을 생성합니다.
	 */
	@Post()
	@ApiOperation({
		summary: 'Article 생성',
		description: '새로운 Article을 생성합니다.',
	})
	@ApiBody({ type: CreateArticleInput })
	@ApiResponse({
		status: 201,
		description: 'Article 생성 성공',
		type: ArticleOutput,
	})
	@ApiResponse({
		status: 400,
		description: '잘못된 요청 또는 중복된 URL',
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	async createArticle(@Request() req: any, @Body() input: CreateArticleInput): Promise<ArticleOutput> {
		return this.articleService.createArticle(req.user.id, input);
	}

	/**
	 * 사용자의 Article 목록을 조회합니다.
	 */
	@Get()
	@ApiOperation({
		summary: 'Article 목록 조회',
		description: '사용자의 Article 목록을 페이지네이션과 함께 조회합니다.',
	})
	@ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 항목 수' })
	@ApiQuery({ name: 'search', required: false, type: String, description: '검색 키워드' })
	@ApiQuery({ name: 'tags', required: false, type: [String], description: '태그 필터' })
	@ApiQuery({ name: 'isBookmarked', required: false, type: Boolean, description: '북마크 필터' })
	@ApiQuery({ name: 'isArchived', required: false, type: Boolean, description: '아카이브 필터' })
	@ApiQuery({ name: 'sortBy', required: false, type: String, description: '정렬 기준' })
	@ApiQuery({ name: 'sortOrder', required: false, type: String, description: '정렬 순서' })
	@ApiResponse({
		status: 200,
		description: 'Article 목록 조회 성공',
		type: PaginatedArticlesOutput,
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	async getArticles(@Request() req: any, @Query() query: ListArticlesInput): Promise<PaginatedArticlesOutput> {
		return this.articleService.getArticles(req.user.id, query);
	}

	/**
	 * 특정 Article을 조회합니다.
	 */
	@Get(':id')
	@ApiOperation({
		summary: 'Article 조회',
		description: '특정 Article을 조회합니다.',
	})
	@ApiResponse({
		status: 200,
		description: 'Article 조회 성공',
		type: ArticleOutput,
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	@ApiResponse({
		status: 404,
		description: 'Article을 찾을 수 없음',
	})
	async getArticle(@Request() req: any, @Param('id') id: string): Promise<ArticleOutput> {
		return this.articleService.getArticle(req.user.id, id);
	}

	/**
	 * Article을 업데이트합니다.
	 */
	@Put(':id')
	@ApiOperation({
		summary: 'Article 업데이트',
		description: 'Article의 정보를 업데이트합니다.',
	})
	@ApiBody({ type: UpdateArticleInput })
	@ApiResponse({
		status: 200,
		description: 'Article 업데이트 성공',
		type: ArticleOutput,
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	@ApiResponse({
		status: 404,
		description: 'Article을 찾을 수 없음',
	})
	async updateArticle(
		@Request() req: any,
		@Param('id') id: string,
		@Body() input: UpdateArticleInput,
	): Promise<ArticleOutput> {
		return this.articleService.updateArticle(req.user.id, id, input);
	}

	/**
	 * Article을 삭제합니다.
	 */
	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: 'Article 삭제',
		description: 'Article을 삭제합니다.',
	})
	@ApiResponse({
		status: 204,
		description: 'Article 삭제 성공',
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	@ApiResponse({
		status: 404,
		description: 'Article을 찾을 수 없음',
	})
	async deleteArticle(@Request() req: any, @Param('id') id: string): Promise<void> {
		return this.articleService.deleteArticle(req.user.id, id);
	}

	/**
	 * Article 북마크 상태를 토글합니다.
	 */
	@Post(':id/bookmark')
	@ApiOperation({
		summary: 'Article 북마크 토글',
		description: 'Article의 북마크 상태를 토글합니다.',
	})
	@ApiResponse({
		status: 200,
		description: '북마크 상태 변경 성공',
		type: ArticleOutput,
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	@ApiResponse({
		status: 404,
		description: 'Article을 찾을 수 없음',
	})
	async toggleBookmark(@Request() req: any, @Param('id') id: string): Promise<ArticleOutput> {
		return this.articleService.toggleBookmark(req.user.id, id);
	}

	/**
	 * Article 아카이브 상태를 토글합니다.
	 */
	@Post(':id/archive')
	@ApiOperation({
		summary: 'Article 아카이브 토글',
		description: 'Article의 아카이브 상태를 토글합니다.',
	})
	@ApiResponse({
		status: 200,
		description: '아카이브 상태 변경 성공',
		type: ArticleOutput,
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	@ApiResponse({
		status: 404,
		description: 'Article을 찾을 수 없음',
	})
	async toggleArchive(@Request() req: any, @Param('id') id: string): Promise<ArticleOutput> {
		return this.articleService.toggleArchive(req.user.id, id);
	}

	/**
	 * 사용자의 Article 통계를 조회합니다.
	 */
	@Get('stats/overview')
	@ApiOperation({
		summary: 'Article 통계 조회',
		description: '사용자의 Article 통계를 조회합니다.',
	})
	@ApiResponse({
		status: 200,
		description: '통계 조회 성공',
		schema: {
			type: 'object',
			properties: {
				total: { type: 'number', description: '총 Article 수' },
				bookmarked: { type: 'number', description: '북마크된 Article 수' },
				archived: { type: 'number', description: '아카이브된 Article 수' },
				recent: { type: 'number', description: '최근 7일간 추가된 Article 수' },
			},
		},
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	async getArticleStats(@Request() req: any): Promise<{
		total: number;
		bookmarked: number;
		archived: number;
		recent: number;
	}> {
		return this.articleService.getArticleStats(req.user.id);
	}

	/**
	 * 사용자의 모든 태그를 조회합니다.
	 */
	@Get('tags/all')
	@ApiOperation({
		summary: '사용자 태그 목록 조회',
		description: '사용자가 사용한 모든 태그를 조회합니다.',
	})
	@ApiResponse({
		status: 200,
		description: '태그 목록 조회 성공',
		schema: {
			type: 'array',
			items: { type: 'string' },
		},
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	async getUserTags(@Request() req: any): Promise<string[]> {
		return this.articleService.getUserTags(req.user.id);
	}

	/**
	 * URL이 이미 저장되어 있는지 확인합니다.
	 */
	@Get('check-url')
	@ApiOperation({
		summary: 'URL 중복 확인',
		description: 'URL이 이미 저장되어 있는지 확인합니다.',
	})
	@ApiQuery({
		name: 'url',
		required: true,
		type: String,
		description: '확인할 URL',
	})
	@ApiResponse({
		status: 200,
		description: 'URL 확인 성공',
		schema: {
			type: 'object',
			properties: {
				exists: { type: 'boolean', description: 'URL 존재 여부' },
				url: { type: 'string', description: '확인한 URL' },
			},
		},
	})
	@ApiResponse({
		status: 401,
		description: '인증 실패',
	})
	async checkUrl(@Request() req: any, @Query('url') url: string): Promise<{ exists: boolean; url: string }> {
		const exists = await this.articleService.isUrlAlreadySaved(req.user.id, url);
		return { exists, url };
	}
}
