/**
 * YouTube 동영상용 리팩토링된 콘텐츠 핸들러
 * - AbstractContentHandler 기반
 * - SOLID 원칙 및 함수형 프로그래밍 적용
 * - oEmbed API 활용 및 자막 추출 기능 포함
 */
import { Injectable, Logger } from '@nestjs/common';
import { AbstractContentHandler } from '../base/abstract-content-handler';
import {
	HttpRequestConfig,
	DomConfig,
	ContentCleaningConfig,
	TitleExtractionConfig,
} from '../types/content-extraction.types';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * YouTube oEmbed 응답 타입
 */
interface YouTubeOEmbedResponse {
	readonly title: string;
	readonly width: number;
	readonly height: number;
	readonly thumbnail_url: string;
	readonly author_name: string;
	readonly author_url: string;
	readonly provider_name: string;
	readonly provider_url: string;
}

/**
 * YouTube 동영상 핸들러 (Omnivore 방식: 자막 추출 없이 oEmbed만 활용)
 */
@Injectable()
export class YoutubeHandler extends AbstractContentHandler {
	protected readonly logger = new Logger(YoutubeHandler.name);

	/**
	 * YouTube URL 패턴 매칭
	 */
	private readonly YOUTUBE_URL_MATCH =
		/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu\.be))(\/(?:[\w-]+\?v=|embed\/|v\/|shorts\/|playlist\?list=)?)([\w-]+)(\S+)?$/;

	/**
	 * YouTube 동영상 처리 여부
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		return this.YOUTUBE_URL_MATCH.test(url.href);
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return 'YouTube 핸들러';
	}

	/**
	 * HTTP 요청 설정 (YouTube는 별도 요청 불필요)
	 */
	protected get httpConfig(): HttpRequestConfig {
		return {
			userAgent: '',
			timeout: 0,
			headers: {},
			redirect: 'follow',
		};
	}

	/**
	 * DOM 생성 설정 (YouTube는 사용하지 않음)
	 */
	protected get domConfig(): DomConfig {
		return {
			userAgent: '',
			resources: 'usable',
			runScripts: 'outside-only',
			pretendToBeVisual: false,
		};
	}

	/**
	 * 콘텐츠 정제 설정 (YouTube는 정제 불필요)
	 */
	protected get cleaningConfig(): ContentCleaningConfig {
		return {
			removeUnwantedElements: false,
			cleanupStyles: false,
			cleanupLinks: false,
			cleanupImages: false,
			cleanupText: false,
			refineTitle: true,
		};
	}

	/**
	 * 제목 추출 설정 (videoId 기반)
	 */
	protected get titleConfig(): TitleExtractionConfig {
		return {
			selectors: [],
			patterns: [],
			siteSpecificPatterns: {},
		};
	}

	/**
	 * 본문 콘텐츠 추출용 셀렉터 (사용하지 않음)
	 */
	protected get contentSelectors(): readonly string[] {
		return [];
	}

	/**
	 * YouTube 동영상 처리 - oEmbed API 활용 및 자막 추출
	 * @param url YouTube URL
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			const videoId = this.extractVideoId(url);
			if (!videoId) {
				this.logger.warn(`Could not extract video ID from: ${url.href}`);
				return null;
			}

			// oEmbed API로 동영상 정보 가져오기
			const oembedData = await this.fetchOEmbedData(url.href);
			if (!oembedData) {
				this.logger.warn(`YouTube oEmbed API 실패: ${url.href}`);
				return this.generateFallbackContent(videoId, url);
			}

			// HTML 콘텐츠 생성
			const content = this.generateVideoContent(videoId, url, oembedData);

			return {
				url: url.href,
				title: oembedData.title,
				content,
				contentType: 'text/html',
			};
		} catch (error) {
			this.logger.warn(`YoutubeHandler failed for ${url.href}: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * 다양한 YouTube URL에서 videoId 추출
	 * @param url YouTube URL
	 */
	private extractVideoId(url: URL): string | null {
		if (url.hostname === 'youtu.be') {
			return url.pathname.slice(1);
		}
		if (url.searchParams.has('v')) {
			return url.searchParams.get('v');
		}
		const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
		if (embedMatch) {
			return embedMatch[1];
		}
		const vMatch = url.pathname.match(/\/v\/([^/?]+)/);
		if (vMatch) {
			return vMatch[1];
		}
		const shortsMatch = url.pathname.match(/\/shorts\/([^/?]+)/);
		if (shortsMatch) {
			return shortsMatch[1];
		}
		return null;
	}

	/**
	 * YouTube oEmbed API로 동영상 정보 가져오기
	 * @param url YouTube URL
	 */
	private async fetchOEmbedData(url: string): Promise<YouTubeOEmbedResponse | null> {
		try {
			const oembedUrl = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
			const response = await fetch(oembedUrl);
			if (!response.ok) {
				this.logger.warn(`oEmbed API 응답 실패: ${response.status}`);
				return null;
			}
			const data = (await response.json()) as YouTubeOEmbedResponse;
			return data;
		} catch (error) {
			this.logger.warn(`oEmbed API 요청 실패: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * oEmbed 데이터를 포함한 HTML 콘텐츠 생성
	 * @param videoId YouTube video ID
	 * @param originalUrl 원본 URL
	 * @param oembedData oEmbed API 응답 데이터
	 */
	private generateVideoContent(videoId: string, originalUrl: URL, oembedData: YouTubeOEmbedResponse): string {
		const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
		const embedUrl = `https://www.youtube.com/embed/${videoId}`;
		const timestamp = originalUrl.searchParams.get('t');
		const timestampText = timestamp ? ` (starting at ${timestamp})` : '';
		const ratio = oembedData.width / oembedData.height;
		const height = 350;
		const width = Math.round(height * ratio);
		return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(oembedData.title)}</title>
    <meta property="og:image" content="${oembedData.thumbnail_url}" />
    <meta property="og:image:secure_url" content="${oembedData.thumbnail_url}" />
    <meta property="og:title" content="${this.escapeHtml(oembedData.title)}" />
    <meta property="og:description" content="${this.escapeHtml(oembedData.title)}" />
    <meta property="og:article:author" content="${this.escapeHtml(oembedData.author_name)}" />
    <meta property="og:site_name" content="YouTube" />
    <meta property="og:type" content="video" />
    <style>
        .youtube-container {
            max-width: 800px;
            margin: 0 auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
        }
        .youtube-video {
            margin-bottom: 2rem;
        }
        .video-embed {
            position: relative;
            width: 100%;
            max-width: ${width}px;
            margin: 0 auto 1rem;
        }
        .video-embed iframe {
            width: 100%;
            height: ${height}px;
            border: none;
            border-radius: 8px;
        }
        .video-info {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }
        .video-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #1a1a1a;
        }
        .video-author {
            color: #666;
            margin-bottom: 1rem;
        }
        .video-author a {
            color: #065fd4;
            text-decoration: none;
        }
        .video-author a:hover {
            text-decoration: underline;
        }
        .video-description {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid #065fd4;
        }
        .original-link {
            text-align: center;
            margin-top: 1rem;
        }
        .original-link a {
            color: #065fd4;
            text-decoration: none;
            font-weight: 500;
        }
        .original-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="youtube-container">
        <article id="_omnivore_youtube">
            <div class="youtube-video">
                <div class="video-embed">
                    <iframe 
                        id="_omnivore_youtube_video" 
                        src="${embedUrl}" 
                        title="${this.escapeHtml(oembedData.title)}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
                <div class="video-info">
                    <h1 class="video-title">${this.escapeHtml(oembedData.title)}</h1>
                    <div class="video-author">
                        By <a href="${oembedData.author_url}" target="_blank">${this.escapeHtml(oembedData.author_name)}</a>
                    </div>
                    <div class="video-description">
                        <strong>동영상 정보:</strong><br>
                        • <a href="${watchUrl}" target="_blank">YouTube에서 보기</a>${timestampText}<br>
                        • 임베드 URL: <a href="${embedUrl}" target="_blank">${embedUrl}</a>
                    </div>
                </div>
            </div>
            <div class="original-link">
                <a href="${originalUrl.href}" target="_blank">원본 YouTube 페이지로 이동</a>
            </div>
        </article>
    </div>
</body>
</html>`.trim();
	}

	/**
	 * oEmbed API 실패 시 기본 콘텐츠 생성
	 * @param videoId YouTube video ID
	 * @param originalUrl 원본 URL
	 */
	private generateFallbackContent(videoId: string, originalUrl: URL): PreHandleResult {
		const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
		const embedUrl = `https://www.youtube.com/embed/${videoId}`;
		return {
			url: originalUrl.href,
			title: `YouTube Video: ${videoId}`,
			content: `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>YouTube Video: ${videoId}</title>
    <style>
        .youtube-container {
            max-width: 800px;
            margin: 0 auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 2rem;
        }
        .video-embed {
            margin-bottom: 2rem;
        }
        .video-embed iframe {
            width: 560px;
            height: 315px;
            border: none;
            border-radius: 8px;
        }
        .video-info {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="youtube-container">
        <div class="video-embed">
            <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
        </div>
        <div class="video-info">
            <h2>YouTube Video: ${videoId}</h2>
            <p><a href="${watchUrl}" target="_blank">YouTube에서 보기</a></p>
            <p><em>동영상 정보를 가져올 수 없습니다. YouTube API 응답을 확인해주세요.</em></p>
        </div>
    </div>
</body>
</html>`.trim(),
			contentType: 'text/html',
		};
	}

	/**
	 * HTML 특수문자 이스케이프
	 * @param text 이스케이프할 텍스트
	 */
	private escapeHtml(text: string): string {
		const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		};
		return text.replace(/[&<>"']/g, (m) => map[m]);
	}
}
