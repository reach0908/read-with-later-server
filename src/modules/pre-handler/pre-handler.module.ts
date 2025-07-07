import { Module, Provider } from '@nestjs/common';
import { PreHandlerService } from './pre-handler.service';
import { ReadabilityHandler } from './handlers/readability.handler';
import { HandlerFactory } from './factories/handler-factory';
import { DomainSpecificHandler } from './handlers/domain-specific.handler';
import { PdfHandler } from './handlers/pdf.handler';
import { RssHandler } from './handlers/rss.handler';
import { YoutubeHandler } from './handlers/youtube.handler';
import { SocialMediaHandler } from './handlers/social-media.handler';
import { NewsSiteHandler } from './handlers/news-site.handler';
import { StibeeHandler } from './handlers/stibee.handler';
import { MailyHandler } from './handlers/maily.handler';
import { TistoryHandler } from './handlers/tistory.handler';
import { MediumHandler } from './handlers/medium.handler';
import { NaverBlogHandler } from './handlers/naver-blog.handler';
import { DisquietHandler } from './handlers/disquiet.handler';
import { ContentQualityEvaluator } from '../scraper/services/content-quality-evaluator';
import { CONTENT_HANDLER_TOKEN, IContentHandler } from './interfaces/content-handler.interface';

/**
 * Encapsulates all content pre-handling logic.
 * This module uses a custom provider token (CONTENT_HANDLER_TOKEN) to dynamically
 * inject all content handlers into the HandlerFactory. This adheres to the
 * Open/Closed Principle, allowing new handlers to be added without modifying
 * the factory.
 */

// Define the order of handlers. Specific handlers should come before general ones.
const handlers: Provider<IContentHandler>[] = [
	// 1. Handlers for specific file types or non-HTML content
	PdfHandler,
	RssHandler,
	YoutubeHandler,

	// 2. Handlers for specific platforms with complex extraction logic
	TistoryHandler,
	NaverBlogHandler,
	MediumHandler,
	DisquietHandler,

	// 3. Handlers for newsletter platforms
	StibeeHandler,
	MailyHandler,

	// 4. Handlers that transform URLs
	SocialMediaHandler,
	NewsSiteHandler,
	DomainSpecificHandler,

	// 5. Fallback handler for general web content
	ReadabilityHandler,
];

// Create a custom provider for the array of handlers
const handlerProviders: Provider[] = handlers.map((handler) => ({
	provide: CONTENT_HANDLER_TOKEN,
	useClass: handler as new (...args: any[]) => IContentHandler,
}));

@Module({
	providers: [
		PreHandlerService,
		HandlerFactory,
		ContentQualityEvaluator,
		...handlers, // Register each handler as a provider
		...handlerProviders, // Provide the array of handlers under the token
	],
	exports: [PreHandlerService],
})
export class PreHandlerModule {}
