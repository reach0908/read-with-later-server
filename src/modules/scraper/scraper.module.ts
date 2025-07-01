import { Module } from '@nestjs/common';
import { ScraperController } from 'src/modules/scraper/scraper.controller';
import { ScraperService } from 'src/modules/scraper/scraper.service';

@Module({
	controllers: [ScraperController],
	providers: [ScraperService],
})
export class ScraperModule {}
