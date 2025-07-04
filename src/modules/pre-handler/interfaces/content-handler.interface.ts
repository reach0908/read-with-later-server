import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * Injection token for providing an array of IContentHandler implementations.
 * This allows for flexible and extensible handler registration.
 */
export const CONTENT_HANDLER_TOKEN = 'CONTENT_HANDLER_TOKEN';

/**
 * Defines the contract for content handlers.
 * Each handler is responsible for processing a specific type of content (e.g., a PDF file, a specific domain).
 */
export interface IContentHandler {
	/**
	 * Determines if the handler can process the content from the given URL.
	 * @param url - The URL to be checked.
	 * @returns `true` if the handler can process the URL, `false` otherwise.
	 */
	canHandle(url: URL): boolean;

	/**
	 * Processes the content from the URL and extracts relevant data.
	 * @param url - The URL of the content to handle.
	 * @returns A promise that resolves to a `PreHandleResult` object, or `null` if handling fails.
	 */
	handle(url: URL): Promise<PreHandleResult | null>;
}
