/**
 * PDF 파일을 위한 리팩토링된 콘텐츠 핸들러
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

/**
 * PDF 파일 핸들러
 */
@Injectable()
export class PdfHandler extends AbstractContentHandler {
	protected readonly logger = new Logger(PdfHandler.name);

	/**
	 * PDF 파일 처리 여부
	 * @param url 검사할 URL
	 */
	public canHandle(url: URL): boolean {
		if (url.pathname.toLowerCase().endsWith('.pdf')) {
			return true;
		}
		const pdfPatterns = [/\/pdf\//i, /\.pdf$/i, /\/download.*\.pdf/i, /\/files.*\.pdf/i, /\/documents.*\.pdf/i];
		return pdfPatterns.some((pattern) => pattern.test(url.pathname));
	}

	/**
	 * 핸들러 이름
	 */
	protected get handlerName(): string {
		return 'PDF 핸들러';
	}

	/**
	 * HTTP 요청 설정 (PDF는 별도 요청 불필요)
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
	 * DOM 생성 설정 (PDF는 사용하지 않음)
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
	 * 콘텐츠 정제 설정 (PDF는 정제 불필요)
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
	 * 제목 추출 설정 (파일명 기반)
	 */
	protected get titleConfig(): TitleExtractionConfig {
		return {
			selectors: [],
			patterns: [/\.pdf$/i, /[-_]/g],
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
	 * PDF는 별도 본문 추출 없이 타입 마킹만 수행
	 */
	public handle(url: URL): Promise<PreHandleResult | null> {
		try {
			let title: string | undefined;
			const pathParts = url.pathname.split('/');
			const filename = pathParts[pathParts.length - 1];
			if (filename && filename.includes('.pdf')) {
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
