import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Request } from '@nestjs/common';
import { ScrapeUrlDto } from 'src/modules/scraper/dto/scrape-url.dto';
import { ScraperService } from 'src/modules/scraper/scraper.service';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { AuthRequest } from 'src/types';

@Controller('/scrape')
@UseGuards(JwtAuthGuard)
export class ScraperController {
	constructor(private readonly scraperService: ScraperService) {}

	@ApiOperation({ summary: 'Scrape a URL' })
	@ApiBody({ type: ScrapeUrlDto })
	@ApiResponse({ status: 201, description: 'Scraping completed successfully.' })
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async scrape(@Body() dto: ScrapeUrlDto, @Request() req: AuthRequest) {
		const article = await this.scraperService.scrapeAndSave(dto.url, req.user.id);
		return {
			articleId: article.id,
			message: 'Scraping completed successfully.',
		};
	}
}
