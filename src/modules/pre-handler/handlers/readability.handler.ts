import { Injectable, Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * A content handler that uses Mozilla's Readability library to extract
 * the main readable content from a generic webpage.
 */
@Injectable()
export class ReadabilityHandler implements IContentHandler {
	private readonly logger = new Logger(ReadabilityHandler.name);
	private readonly USER_AGENT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

	/**
	 * This handler can attempt to process any HTTP/HTTPS URL.
	 * It should typically be placed last in the handler chain as a fallback.
	 * @param url - The URL to check.
	 * @returns `true` if the protocol is http or https.
	 */
	public canHandle(url: URL): boolean {
		return ['http:', 'https:'].includes(url.protocol);
	}

	/**
	 * Fetches the webpage, parses it with JSDOM, and extracts the article content.
	 * @param url - The URL to handle.
	 * @returns A `PreHandleResult` with the extracted article, or `null` on failure.
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			const dom = await JSDOM.fromURL(url.href, {
				userAgent: this.USER_AGENT,
			});

			const reader = new Readability(dom.window.document);
			const article = reader.parse();

			if (!article?.content) {
				this.logger.debug(`Readability could not find content for: ${url.href}`);
				return null;
			}

			return {
				url: url.href,
				title: article.title ?? undefined,
				content: article.content,
				contentType: 'text/html',
			};
		} catch (error) {
			this.logger.warn(`ReadabilityHandler failed for ${url.href}: ${(error as Error).message}`);
			return null;
		}
	}
}
