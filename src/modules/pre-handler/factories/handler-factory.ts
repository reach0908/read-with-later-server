/**
 * 핸들러 팩토리
 * - 도메인별 핸들러를 DI 받아 URL에 따라 적절한 핸들러를 반환
 * - getAllHandlers()로 전체 핸들러 배열 반환
 */
import { Injectable } from '@nestjs/common';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { MailyHandler } from '../handlers/maily.handler';
import { StibeeHandler } from '../handlers/stibee.handler';
import { PdfHandler } from '../handlers/pdf.handler';
import { RssHandler } from '../handlers/rss.handler';
import { YoutubeHandler } from '../handlers/youtube.handler';
import { NewsSiteHandler } from '../handlers/news-site.handler';
import { TistoryHandler } from '../handlers/tistory.handler';
import { MediumHandler } from '../handlers/medium.handler';
import { NaverBlogHandler } from '../handlers/naver-blog.handler';
import { DomainSpecificHandler } from '../handlers/domain-specific.handler';
import { SocialMediaHandler } from '../handlers/social-media.handler';
import { ReadabilityHandler } from '../handlers/readability.handler';
import { DisquietHandler } from '../handlers/disquiet.handler';
// 필요시 다른 핸들러 import

/**
 * 핸들러 팩토리 클래스
 */
@Injectable()
export class HandlerFactory {
	private readonly handlerChain: IContentHandler[];

	constructor(
		private readonly mailyHandler: MailyHandler,
		private readonly stibeeHandler: StibeeHandler,
		private readonly pdfHandler: PdfHandler,
		private readonly rssHandler: RssHandler,
		private readonly youtubeHandler: YoutubeHandler,
		private readonly newsSiteHandler: NewsSiteHandler,
		private readonly tistoryHandler: TistoryHandler,
		private readonly mediumHandler: MediumHandler,
		private readonly disquietHandler: DisquietHandler,
		private readonly naverBlogHandler: NaverBlogHandler,
		private readonly domainSpecificHandler: DomainSpecificHandler,
		private readonly socialMediaHandler: SocialMediaHandler,
		private readonly readabilityHandler: ReadabilityHandler,
		// 필요시 다른 핸들러 DI
	) {
		// 우선순위: 도메인 특화 → 소셜/뉴스 → 일반 → fallback
		this.handlerChain = [
			this.mailyHandler,
			this.stibeeHandler,
			this.pdfHandler,
			this.rssHandler,
			this.youtubeHandler,
			this.tistoryHandler,
			this.naverBlogHandler,
			this.mediumHandler,
			this.disquietHandler,
			this.domainSpecificHandler,
			this.socialMediaHandler,
			this.newsSiteHandler,
			this.readabilityHandler, // 항상 마지막 fallback
		];
	}

	/**
	 * URL에 적합한 핸들러 반환 (우선순위 순회)
	 * @param url URL 객체
	 * @returns IContentHandler
	 */
	public createHandler(url: URL): IContentHandler {
		for (const handler of this.handlerChain) {
			if (handler.canHandle(url)) {
				return handler;
			}
		}
		// 이론상 도달 불가 (readability가 항상 true)
		throw new Error('No suitable handler found for this URL');
	}

	/**
	 * 전체 핸들러 배열 반환
	 */
	public getAllHandlers(): IContentHandler[] {
		return this.handlerChain;
	}
}
