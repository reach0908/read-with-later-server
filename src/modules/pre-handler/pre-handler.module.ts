import { Module } from '@nestjs/common';
import { RefactoredPreHandlerService } from './pre-handler.service';
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
 * 7. MailyHandler - Extracts Maily newsletter content
 * 8. TistoryHandler - Transforms Tistory URLs
 * 9. DomainSpecificHandler - Transforms URLs for other specific domains
 * 10. ReadabilityHandler - Fallback for general web content
 */
@Module({
	providers: [
		RefactoredPreHandlerService,
		HandlerFactory,
		PdfHandler,
		RssHandler,
		YoutubeHandler,
		SocialMediaHandler,
		NewsSiteHandler,
		StibeeHandler,
		MailyHandler,
		TistoryHandler,
		MediumHandler,
		DisquietHandler,
		NaverBlogHandler,
		DomainSpecificHandler,
		ReadabilityHandler,
	],
	exports: [RefactoredPreHandlerService],
})
export class PreHandlerModule {}
