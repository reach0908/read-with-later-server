import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { ArticleModule } from '../article/article.module';

// Implementations
import { TurndownHtmlConverter } from './converters/turndown-html.converter';
import { ArticleStateManagerService } from './services/article-state-manager.service';
import { LightweightScrapingStrategy } from './strategies/lightweight-scraping.strategy';
import { HeavyweightScrapingStrategy } from './strategies/heavyweight-scraping.strategy';
import { ScrapingStrategyFactory } from './factories/scraping-strategy.factory';

// Tokens
import { HTML_CONVERTER_TOKEN, ARTICLE_STATE_MANAGER_TOKEN } from './constants/injection.tokens';

@Module({
	imports: [ArticleModule],
	controllers: [ScraperController],
	providers: [
		ScraperService,

		// HTML Converter
		{
			provide: HTML_CONVERTER_TOKEN,
			useClass: TurndownHtmlConverter,
		},

		// Article State Manager
		{
			provide: ARTICLE_STATE_MANAGER_TOKEN,
			useClass: ArticleStateManagerService,
		},

		// Scraping Strategies
		LightweightScrapingStrategy,
		HeavyweightScrapingStrategy,

		// Strategy Factory
		{
			provide: ScrapingStrategyFactory,
			useFactory: (
				lightweightStrategy: LightweightScrapingStrategy,
				heavyweightStrategy: HeavyweightScrapingStrategy,
			) => {
				return new ScrapingStrategyFactory([lightweightStrategy, heavyweightStrategy]);
			},
			inject: [LightweightScrapingStrategy, HeavyweightScrapingStrategy],
		},
	],
	exports: [ScraperService],
})
export class ScraperModule {}
