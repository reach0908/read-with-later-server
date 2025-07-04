import { Injectable, Logger } from '@nestjs/common';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * A content handler specifically for PDF files.
 * This handler detects PDF URLs and marks them appropriately
 * so that the main scraping service can handle them differently.
 */
@Injectable()
export class PdfHandler implements IContentHandler {
	private readonly logger = new Logger(PdfHandler.name);

	/**
	 * Checks if the URL points to a PDF file.
	 * @param url - The URL to check.
	 * @returns `true` if the URL appears to be a PDF file.
	 */
	public canHandle(url: URL): boolean {
		// Check file extension
		if (url.pathname.toLowerCase().endsWith('.pdf')) {
			return true;
		}

		// Check for common PDF hosting patterns
		const pdfPatterns = [/\/pdf\//i, /\.pdf$/i, /\/download.*\.pdf/i, /\/files.*\.pdf/i, /\/documents.*\.pdf/i];

		return pdfPatterns.some((pattern) => pattern.test(url.pathname));
	}

	/**
	 * Processes PDF URLs by marking them with the correct content type.
	 * @param url - The URL of the PDF to handle.
	 * @returns A `PreHandleResult` with PDF content type, or `null` on failure.
	 */
	public handle(url: URL): Promise<PreHandleResult | null> {
		try {
			// For PDF files, we don't extract content here but mark the content type
			// The main service will handle PDF extraction using appropriate tools
			this.logger.debug(`Detected PDF file: ${url.href}`);

			// Try to extract title from URL path
			let title: string | undefined;
			const pathParts = url.pathname.split('/');
			const filename = pathParts[pathParts.length - 1];

			if (filename && filename.includes('.pdf')) {
				// Remove .pdf extension and clean up the filename for title
				title = filename
					.replace(/\.pdf$/i, '')
					.replace(/[-_]/g, ' ')
					.replace(/\b\w/g, (l) => l.toUpperCase())
					.trim();
			}

			return Promise.resolve({
				url: url.href,
				title,
				contentType: 'application/pdf',
			});
		} catch (error) {
			this.logger.warn(`PdfHandler failed for ${url.href}: ${(error as Error).message}`);
			return Promise.resolve(null);
		}
	}
}
