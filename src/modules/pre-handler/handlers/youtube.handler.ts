import { Injectable, Logger } from '@nestjs/common';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * A content handler specifically for YouTube videos.
 * This handler detects YouTube URLs and attempts to extract
 * video metadata and transcripts when available.
 */
@Injectable()
export class YoutubeHandler implements IContentHandler {
	private readonly logger = new Logger(YoutubeHandler.name);

	/**
	 * Checks if the URL is a YouTube video.
	 * @param url - The URL to check.
	 * @returns `true` if the URL is a YouTube video.
	 */
	public canHandle(url: URL): boolean {
		const youtubeHosts = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];

		if (!youtubeHosts.includes(url.hostname)) {
			return false;
		}

		// Check for video patterns
		if (url.hostname === 'youtu.be') {
			return url.pathname.length > 1; // Has video ID
		}

		// For youtube.com domains
		return url.pathname.includes('/watch') || url.pathname.includes('/embed/') || url.pathname.includes('/v/');
	}

	/**
	 * Processes YouTube URLs to extract video information.
	 * @param url - The YouTube URL to handle.
	 * @returns A `PreHandleResult` with video information, or `null` on failure.
	 */
	public handle(url: URL): Promise<PreHandleResult | null> {
		try {
			const videoId = this.extractVideoId(url);
			if (!videoId) {
				this.logger.warn(`Could not extract video ID from: ${url.href}`);
				return Promise.resolve(null);
			}

			// For now, we'll return basic information
			// In a full implementation, you might want to:
			// 1. Fetch video metadata from YouTube API
			// 2. Extract auto-generated captions/transcripts
			// 3. Convert video description to readable format

			const title = `YouTube Video: ${videoId}`;
			const content = this.generateVideoContent(videoId, url);

			return Promise.resolve({
				url: url.href,
				title,
				content,
				contentType: 'text/html',
			});
		} catch (error) {
			this.logger.warn(`YoutubeHandler failed for ${url.href}: ${(error as Error).message}`);
			return Promise.resolve(null);
		}
	}

	/**
	 * Extracts the video ID from various YouTube URL formats.
	 * @param url - The YouTube URL.
	 * @returns The video ID or null if not found.
	 */
	private extractVideoId(url: URL): string | null {
		// For youtu.be format
		if (url.hostname === 'youtu.be') {
			return url.pathname.slice(1);
		}

		// For youtube.com formats
		if (url.searchParams.has('v')) {
			return url.searchParams.get('v');
		}

		// For embed URLs
		const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
		if (embedMatch) {
			return embedMatch[1];
		}

		// For /v/ URLs
		const vMatch = url.pathname.match(/\/v\/([^/?]+)/);
		if (vMatch) {
			return vMatch[1];
		}

		return null;
	}

	/**
	 * Generates readable content for a YouTube video.
	 * @param videoId - The YouTube video ID.
	 * @param originalUrl - The original URL.
	 * @returns HTML content representing the video.
	 */
	private generateVideoContent(videoId: string, originalUrl: URL): string {
		const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
		const embedUrl = `https://www.youtube.com/embed/${videoId}`;

		// Extract timestamp if present
		const timestamp = originalUrl.searchParams.get('t');
		const timestampText = timestamp ? ` (starting at ${timestamp})` : '';

		return `
      <div class="youtube-video">
        <h2>YouTube Video</h2>
        <p><strong>Video ID:</strong> ${videoId}</p>
        <p><strong>Watch URL:</strong> <a href="${watchUrl}">${watchUrl}</a>${timestampText}</p>
        <p><strong>Embed URL:</strong> <a href="${embedUrl}">${embedUrl}</a></p>
        
        <div class="video-note">
          <p><em>Note: This is a YouTube video. To get the full content including transcripts, 
          additional processing would be required using YouTube's API or transcript extraction tools.</em></p>
        </div>
        
        <iframe width="560" height="315" 
                src="${embedUrl}" 
                frameborder="0" 
                allowfullscreen>
        </iframe>
      </div>
    `.trim();
	}
}
