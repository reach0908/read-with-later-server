import { Module } from '@nestjs/common';
import { ScrapeController } from './scrape.controller';
import { ScrapeService } from './services/scrape.service';
import { DatabaseModule } from 'src/database/database.module';
import { CrawlerModule } from 'src/modules/crawler/crawler.module';

@Module({
	imports: [DatabaseModule, CrawlerModule],
	controllers: [ScrapeController],
	providers: [ScrapeService],
})
export class ScrapeModule {}
