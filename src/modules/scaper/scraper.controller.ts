import { Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScraperService } from './scraper.service';
import { Body } from '@nestjs/common';
import { ScrapeInput } from './dto/scrape.input';

@ApiTags('Scraper')
@Controller('scraper')
export class ScraperController {
	constructor(private readonly scraperService: ScraperService) {}

	@ApiOperation({ summary: 'Scrape a URL' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				url: { type: 'string' },
			},
		},
	})
	@Post('scrape')
	async scrape(@Body() body: ScrapeInput) {
		return this.scraperService.scrape(body.url);
	}
}
