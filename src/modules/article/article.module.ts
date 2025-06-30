import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { ScrapingService } from './services/scraping.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
	imports: [
		DatabaseModule,
		ConfigModule, // ConfigService 사용을 위해
	],
	controllers: [ArticleController],
	providers: [ArticleService, ScrapingService],
	exports: [ArticleService, ScrapingService],
})
export class ArticleModule {}
