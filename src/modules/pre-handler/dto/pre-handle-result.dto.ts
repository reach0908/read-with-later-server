/**
 * DTO for the result of a pre-handling process.
 * It encapsulates the data extracted by a content handler.
 */
export class PreHandleResult {
	/**
	 * The final URL after potential redirects or modifications by a handler.
	 */
	url: string;

	/**
	 * The extracted title of the content, if available.
	 * @optional
	 */
	title?: string;

	/**
	 * The extracted main content, typically in HTML format.
	 * @optional
	 */
	content?: string;

	/**
	 * The MIME type of the content (e.g., 'text/html', 'application/pdf').
	 * @optional
	 */
	contentType?: string;
}
