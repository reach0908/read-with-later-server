import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

@Module({
	imports: [
		BullModule.registerQueue({
			name: 'scraper',
		}),
	],
	controllers: [ScraperController],
	providers: [ScraperService],
})
export class ScraperModule {}
