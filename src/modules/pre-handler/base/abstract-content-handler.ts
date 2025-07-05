/**
 * 추상 핸들러 베이스 클래스 (템플릿 메서드 패턴)
 * - SOLID 원칙 및 함수형 프로그래밍 기반
 */
import { Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';
import {
	HttpRequestConfig,
	DomConfig,
	ContentCleaningConfig,
	TitleExtractionConfig,
	ContentExtractionResult,
} from '../types/content-extraction.types';
import { fetchHtml, createDom, extractTitle, findContentElement, Result, Option } from '../utils/functional-utils';
import { createContentCleaningPipeline } from '../utils/content-cleaning-pipeline';

/**
 * 콘텐츠 핸들러의 공통 추상 클래스
 * - 템플릿 메서드 패턴 기반
 * - 공통 로직을 추상화하고, 구체 구현은 하위 클래스에 위임
 */
export abstract class AbstractContentHandler implements IContentHandler {
	protected readonly logger = new Logger(this.constructor.name);

	/**
	 * 핸들러가 처리할 수 있는 URL인지 확인
	 * @param url 검사할 URL
	 */
	public abstract canHandle(url: URL): boolean;

	/**
	 * 핸들러 이름 (로깅용)
	 */
	protected abstract get handlerName(): string;

	/**
	 * HTTP 요청 설정
	 */
	protected abstract get httpConfig(): HttpRequestConfig;

	/**
	 * DOM 생성 설정
	 */
	protected abstract get domConfig(): DomConfig;

	/**
	 * 콘텐츠 정제 설정
	 */
	protected abstract get cleaningConfig(): ContentCleaningConfig;

	/**
	 * 제목 추출 설정
	 */
	protected abstract get titleConfig(): TitleExtractionConfig;

	/**
	 * 콘텐츠 선택자들
	 */
	protected abstract get contentSelectors(): readonly string[];

	/**
	 * 템플릿 메서드: 핸들링 프로세스
	 * @param url 처리할 URL
	 * @returns 추출 결과 또는 null
	 */
	public async handle(url: URL): Promise<PreHandleResult | null> {
		try {
			this.logger.debug(`${this.handlerName} 콘텐츠 추출 시작: ${url.href}`);
			const result = await this.extractContent(url);
			if (!result.success) {
				this.logger.debug(`${this.handlerName} 콘텐츠 추출 실패: ${result.error.message}`);
				return null;
			}
			const { title, content } = result.data;
			if (!content) {
				this.logger.debug(`${this.handlerName} 콘텐츠 없음: ${url.href}`);
				return null;
			}
			this.logger.log(`${this.handlerName} 콘텐츠 추출 성공: ${content.length} 글자`);
			return {
				url: url.href,
				title,
				content,
				contentType: 'text/html',
			};
		} catch (error) {
			this.logger.warn(`${this.handlerName} 핸들러 처리 실패 ${url.href}: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * 콘텐츠 추출 (함수형 프로그래밍)
	 * @param url 처리할 URL
	 * @returns 추출 결과 Result
	 */
	private async extractContent(url: URL): Promise<Result<ContentExtractionResult, Error>> {
		const htmlResult = await fetchHtml(url.href, this.httpConfig);
		if (!htmlResult.success) {
			return { success: false, error: htmlResult.error };
		}
		const domResult = createDom(htmlResult.data, this.domConfig);
		if (!domResult.success) {
			return { success: false, error: domResult.error };
		}
		return { success: true, data: this.processDom(domResult.data, url.href) };
	}

	/**
	 * DOM 처리 및 콘텐츠 정제
	 * @param dom JSDOM 인스턴스
	 * @param url 기준 URL
	 * @returns 추출 결과
	 */
	private processDom(dom: JSDOM, url: string): ContentExtractionResult {
		const document = dom.window.document;
		// 제목 추출
		const titleOption: Option<string> = extractTitle(
			document,
			this.titleConfig.selectors,
			this.titleConfig.patterns,
		);
		const title: string | undefined = titleOption == null ? undefined : titleOption;
		// 콘텐츠 요소 찾기
		const contentElement = findContentElement(document, this.contentSelectors);
		if (!contentElement) {
			return { title, contentType: 'text/html', url };
		}
		// 콘텐츠 정제
		const cleaningPipeline = createContentCleaningPipeline(this.cleaningConfig);
		const cleanedElement = cleaningPipeline(contentElement, {
			baseUrl: url,
			config: this.cleaningConfig,
			logger: this.logger,
		});
		return {
			title,
			content: cleanedElement.outerHTML,
			contentType: 'text/html',
			url,
		};
	}
}
