import { Module } from '@nestjs/common';
import { BrowserService } from './services/browser.service';
import { PuppeteerParseService } from './services/puppeteer-parse.service';
import { PreHandlerModule } from '../pre-handler/pre-handler.module';
import { ArticleModule } from '../article/article.module';
import { ScraperController } from './scraper.controller';
import { ContentQualityEvaluator } from './services/content-quality-evaluator';

@Module({
	imports: [PreHandlerModule, ArticleModule],
	controllers: [ScraperController],
	providers: [BrowserService, PuppeteerParseService, ContentQualityEvaluator],
	exports: [PuppeteerParseService],
})
export class ScraperModule {}
