import { Module } from '@nestjs/common';
import { BrowserService } from './services/browser.service';
import { PuppeteerParseService } from './services/puppeteer-parse.service';
import { PreHandlerModule } from '../pre-handler/pre-handler.module';
import { ArticleModule } from '../article/article.module';
import { ScraperController } from './scraper.controller';

@Module({
	imports: [PreHandlerModule, ArticleModule],
	controllers: [ScraperController],
	providers: [BrowserService, PuppeteerParseService],
	exports: [PuppeteerParseService],
})
export class ScraperModule {}
