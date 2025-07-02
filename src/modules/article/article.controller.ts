import { Controller, Get, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { ArticleService } from './article.service';
import { ArticleResponseDto, ArticleListResponseDto } from './dto/article-response.dto';

interface AuthenticatedRequest extends Request {
	user: {
		id: string;
		email: string;
		name?: string;
	};
}

@Controller('articles')
@UseGuards(JwtAuthGuard)
export class ArticleController {
	constructor(private readonly articleService: ArticleService) {}

	@Get()
	async getMyArticles(@Request() req: AuthenticatedRequest): Promise<ArticleListResponseDto[]> {
		const articles = await this.articleService.findArticlesByUserId(req.user.id);
		return articles.map((article) => new ArticleListResponseDto(article));
	}

	@Get(':id')
	async getArticleById(
		@Param('id') articleId: string,
		@Request() req: AuthenticatedRequest,
	): Promise<ArticleResponseDto> {
		const article = await this.articleService.findArticleByUserIdAndArticleId(req.user.id, articleId);

		if (!article) {
			throw new NotFoundException('해당 아티클을 찾을 수 없습니다.');
		}

		return new ArticleResponseDto(article);
	}
}
