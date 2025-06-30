import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ScrapeDto } from './dto/scrape.dto';
import { ScrapeService } from './services/scrape.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { AuthRequest } from 'src/types';

@Controller('scrape')
export class ScrapeController {
	constructor(private readonly scrapeService: ScrapeService) {}

	@Post()
	@UseGuards(JwtAuthGuard)
	async scrape(@Body() dto: ScrapeDto, @Req() req: AuthRequest) {
		const userId = req.user!.id;

		return this.scrapeService.scrapeAndSave({
			url: dto.url,
			userId,
		});
	}
}
