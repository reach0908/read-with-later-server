import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ScrapeUrlDto } from 'src/modules/scraper/dto/scrape-url.dto';
import { ScraperService } from 'src/modules/scraper/scraper.service';

@Controller('api/v1/scrape')
export class ScraperController {
	constructor(private readonly scraperService: ScraperService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	async scrape(@Body() dto: ScrapeUrlDto) {
		const article = await this.scraperService.scrapeAndSave(dto.url);
		return {
			articleId: article.id,
			message: 'Scraping completed successfully.',
		};
	}
}
