import { Module } from '@nestjs/common';
import { PreHandlerService } from './pre-handler.service';
import { ReadabilityHandler } from './handlers/readability.handler';
import { CONTENT_HANDLER_TOKEN, IContentHandler } from './interfaces/content-handler.interface';
import { DomainSpecificHandler } from './handlers/domain-specific.handler';
import { PdfHandler } from './handlers/pdf.handler';
import { RssHandler } from './handlers/rss.handler';
import { YoutubeHandler } from './handlers/youtube.handler';
import { SocialMediaHandler } from './handlers/social-media.handler';
import { NewsSiteHandler } from './handlers/news-site.handler';
import { StibeeHandler } from './handlers/stibee.handler';

// --- Register all handlers here ---
// The order is important: more specific handlers should come first.
// 1. File type handlers (PDF, RSS) - most specific
// 2. Platform-specific handlers (YouTube) - very specific
// 3. Social media handlers - moderately specific
// 4. News site handlers - moderately specific
// 5. Newsletter platform handlers (Stibee) - moderately specific
// 6. Domain transformation handlers - general transformations
// 7. General readability handler - fallback for everything else
const handlers = [
	PdfHandler,
	RssHandler,
	YoutubeHandler,
	SocialMediaHandler,
	NewsSiteHandler,
	StibeeHandler,
	DomainSpecificHandler,
	ReadabilityHandler,
];

/**
 * Encapsulates all content pre-handling logic.
 * It provides the PreHandlerService and registers all available content handlers.
 * This module is designed to be extensible; new handlers can be added easily.
 *
 * Handler execution order:
 * 1. PdfHandler - Detects and marks PDF files
 * 2. RssHandler - Detects and marks RSS/Atom feeds
 * 3. YoutubeHandler - Extracts YouTube video information
 * 4. SocialMediaHandler - Transforms social media URLs
 * 5. NewsSiteHandler - Transforms news site URLs
 * 6. StibeeHandler - Extracts Stibee newsletter content
 * 7. DomainSpecificHandler - Transforms URLs for other specific domains
 * 8. ReadabilityHandler - Fallback for general web content
 */
@Module({
	providers: [
		PreHandlerService,
		...handlers,
		{
			provide: CONTENT_HANDLER_TOKEN,
			// The useFactory provider collects all registered handlers and makes them
			// available for injection as an array. To add a new handler,
			// simply add it to the `handlers` array above and the `inject` array below.
			useFactory: (...injectedHandlers: IContentHandler[]): IContentHandler[] => injectedHandlers,
			inject: handlers,
		},
	],
	exports: [PreHandlerService],
})
export class PreHandlerModule {}
