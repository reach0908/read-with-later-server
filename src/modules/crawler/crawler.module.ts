import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CrawlerService } from './crawler.service';
import crawlerConfig from 'src/config/crawler.config';

@Module({
	imports: [ConfigModule.forFeature(crawlerConfig)],
	providers: [CrawlerService],
	exports: [CrawlerService],
})
export class CrawlerModule {}
