/**
 * YouTube 동영상용 리팩토링된 콘텐츠 핸들러
 * - AbstractContentHandler 기반
 * - SOLID 원칙 및 함수형 프로그래밍 적용
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
import { fetchHtml, createDom } from '../utils/functional-utils';

/**
 * YouTube 동영상 핸들러
 */
@Injectable()
export class YoutubeHandler extends AbstractContentHandler {
	protected readonly logger = new Logger(YoutubeHandler.name);

	/**
	 * YouTube 동영상 처리 여부
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		const youtubeHosts = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
		if (!youtubeHosts.includes(url.hostname)) {
			return false;
		}
		if (url.hostname === 'youtu.be') {
			return url.pathname.length > 1;
		}
		return url.pathname.includes('/watch') || url.pathname.includes('/embed/') || url.pathname.includes('/v/');
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
	 * YouTube 동영상은 HTML을 직접 fetch해서 타이틀, 설명, 자막(가능하면)을 추출
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			const videoId = this.extractVideoId(url);
			if (!videoId) {
				this.logger.warn(`Could not extract video ID from: ${url.href}`);
				return null;
			}
			const htmlResult = await fetchHtml(url.href, this.httpConfig);
			if (!htmlResult.success) {
				this.logger.warn(`YouTube HTML fetch 실패: ${url.href}`);
				return {
					url: url.href,
					title: `YouTube Video: ${videoId}`,
					content: this.generateVideoContent(videoId, url),
					contentType: 'text/html',
				};
			}
			const domResult = createDom(htmlResult.data, this.domConfig);
			if (!domResult.success) {
				this.logger.warn(`YouTube DOM 파싱 실패: ${url.href}`);
				return {
					url: url.href,
					title: `YouTube Video: ${videoId}`,
					content: this.generateVideoContent(videoId, url),
					contentType: 'text/html',
				};
			}
			const document = domResult.data.window.document;
			const title = this.extractTitleFromDom(document) ?? `YouTube Video: ${videoId}`;
			const description = this.extractDescriptionFromDom(document);
			const captions = this.extractCaptionsFromDom();
			const content = this.generateVideoContent(videoId, url, title, description, captions);
			return {
				url: url.href,
				title,
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
		return null;
	}

	/**
	 * YouTube HTML에서 타이틀 추출
	 */
	private extractTitleFromDom(document: Document): string | undefined {
		const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
		if (ogTitle) return ogTitle;
		const titleTag = document.querySelector('title')?.textContent;
		if (titleTag) return titleTag.replace(/ - YouTube$/, '').trim();
		return undefined;
	}

	/**
	 * YouTube HTML에서 설명 추출
	 */
	private extractDescriptionFromDom(document: Document): string | undefined {
		const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
		if (ogDesc) return ogDesc;
		const descTag = document.querySelector('meta[name="description"]')?.getAttribute('content');
		if (descTag) return descTag;
		return undefined;
	}

	/**
	 * YouTube HTML에서 자막(캡션) 추출 (가능한 경우, 기본은 미지원)
	 * 실제 자막은 클라이언트 JS로 동적으로 로드되므로, 일반적으로는 추출 불가. (향후 개선 가능)
	 */
	private extractCaptionsFromDom(): string | undefined {
		// HTML 내에서 자막 텍스트가 노출되는 경우는 거의 없음. (향후 개선 필요)
		return undefined;
	}

	/**
	 * videoId 기반 HTML 콘텐츠 생성 (타이틀, 설명, 자막 포함)
	 * @param videoId YouTube video ID
	 * @param originalUrl 원본 URL
	 * @param title 동영상 제목
	 * @param description 동영상 설명
	 * @param captions 자막(XML)
	 */
	private generateVideoContent(
		videoId: string,
		originalUrl: URL,
		title?: string,
		description?: string,
		captions?: string,
	): string {
		const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
		const embedUrl = `https://www.youtube.com/embed/${videoId}`;
		const timestamp = originalUrl.searchParams.get('t');
		const timestampText = timestamp ? ` (starting at ${timestamp})` : '';
		return `
      <div class="youtube-video">
        <h2>${title ?? 'YouTube Video'}</h2>
        <p><strong>Video ID:</strong> ${videoId}</p>
        <p><strong>Watch URL:</strong> <a href="${watchUrl}">${watchUrl}</a>${timestampText}</p>
        <p><strong>Embed URL:</strong> <a href="${embedUrl}">${embedUrl}</a></p>
        ${description ? `<div class="video-description"><strong>설명:</strong><br>${description.replace(/\n/g, '<br>')}</div>` : ''}
        <div class="video-note">
          <p><em>Note: This is a YouTube video. To get the full content including transcripts, additional processing would be required using YouTube's API or transcript extraction tools.</em></p>
        </div>
        <iframe width="560" height="315" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
        ${captions ? `<details><summary>자막 보기</summary><pre style="white-space:pre-wrap;">${captions}</pre></details>` : ''}
      </div>
    `.trim();
	}
}
