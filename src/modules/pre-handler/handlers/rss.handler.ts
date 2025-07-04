import { Injectable, Logger } from '@nestjs/common';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * A content handler for RSS/Atom feeds.
 * This handler detects feed URLs and marks them appropriately
 * for specialized feed processing.
 */
@Injectable()
export class RssHandler implements IContentHandler {
	private readonly logger = new Logger(RssHandler.name);

	/**
	 * Checks if the URL points to an RSS or Atom feed.
	 * @param url - The URL to check.
	 * @returns `true` if the URL appears to be a feed.
	 */
	public canHandle(url: URL): boolean {
		// Check file extension
		const feedExtensions = ['.rss', '.xml', '.atom'];
		if (feedExtensions.some((ext) => url.pathname.toLowerCase().endsWith(ext))) {
			return true;
		}

		// Check for common feed URL patterns
		const feedPatterns = [
			/\/feed\/?$/i,
			/\/feeds?\//i,
			/\/rss\/?$/i,
			/\/atom\/?$/i,
			/\/syndication\//i,
			/\/index\.xml$/i,
			/\/rss\.xml$/i,
			/\/atom\.xml$/i,
			/\/feed\.xml$/i,
		];

		return feedPatterns.some((pattern) => pattern.test(url.pathname));
	}

	/**
	 * Processes feed URLs by marking them with the correct content type.
	 * @param url - The URL of the feed to handle.
	 * @returns A `PreHandleResult` with feed content type, or `null` on failure.
	 */
	public handle(url: URL): Promise<PreHandleResult | null> {
		try {
			this.logger.debug(`Detected RSS/Atom feed: ${url.href}`);

			// Try to extract title from URL or domain
			let title: string | undefined;

			// Extract from path
			const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
			if (pathParts.length > 0) {
				const lastPart = pathParts[pathParts.length - 1];
				if (
					!['feed', 'rss', 'atom', 'index.xml', 'rss.xml', 'atom.xml', 'feed.xml'].includes(
						lastPart.toLowerCase(),
					)
				) {
					title = lastPart
						.replace(/[-_]/g, ' ')
						.replace(/\b\w/g, (l) => l.toUpperCase())
						.trim();
				}
			}

			// Fallback to domain name
			if (!title) {
				title = `${url.hostname} Feed`;
			}

			// Determine content type based on URL patterns
			let contentType = 'application/rss+xml';
			if (url.pathname.toLowerCase().includes('atom')) {
				contentType = 'application/atom+xml';
			}

			return Promise.resolve({
				url: url.href,
				title,
				contentType,
			});
		} catch (error) {
			this.logger.warn(`RssHandler failed for ${url.href}: ${(error as Error).message}`);
			return Promise.resolve(null);
		}
	}
}
