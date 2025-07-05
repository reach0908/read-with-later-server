/**
 * 리팩토링된 PreHandlerService
 * - HandlerFactory 기반 함수형/전략 패턴 적용
 */
import { Injectable, Logger } from '@nestjs/common';
import { PreHandleResult } from './dto/pre-handle-result.dto';
import { HandlerFactory } from './factories/handler-factory';
import { IContentHandler } from './interfaces/content-handler.interface';
import { ContentQualityEvaluator } from '../scraper/services/content-quality-evaluator';

/**
 * 리팩토링된 PreHandlerService
 */
@Injectable()
export class RefactoredPreHandlerService {
	private readonly logger = new Logger(RefactoredPreHandlerService.name);

	constructor(
		private readonly handlerFactory: HandlerFactory,
		private readonly contentQualityEvaluator: ContentQualityEvaluator,
	) {}

	/**
	 * 핸들러 체인을 순차적으로 실행하여 결과를 반환합니다.
	 * 품질 평가를 통합하여 효율적인 처리를 수행합니다.
	 * @param urlString 처리할 URL 문자열
	 * @returns PreHandleResult
	 */
	public async execute(urlString: string): Promise<PreHandleResult> {
		const handlers = this.handlerFactory.getAllHandlers();
		this.logger.debug(
			'[DEBUG] Handler chain: ' + handlers.map((h) => (h ? h.constructor.name : 'undefined')).join(', '),
		);
		const currentUrl = new URL(urlString);
		this.logger.debug(`리팩토링된 pre-handler 실행 시작: ${urlString}`);
		const result = await this.executeHandlerChainWithQualityCheck(handlers, currentUrl, {
			url: urlString,
			title: undefined,
			content: undefined,
			contentType: undefined,
		});
		this.logger.debug(`리팩토링된 pre-handler 실행 완료. 최종 결과: url=${result.url}, title=${result.title}`);
		return result;
	}

	/**
	 * 품질 평가를 통합한 핸들러 체인 실행
	 * @param handlers 핸들러 배열
	 * @param currentUrl 현재 URL
	 * @param accumulatedResult 누적 결과
	 * @returns PreHandleResult
	 */
	private async executeHandlerChainWithQualityCheck(
		handlers: IContentHandler[],
		currentUrl: URL,
		accumulatedResult: PreHandleResult,
	): Promise<PreHandleResult> {
		if (handlers.length === 0) {
			return accumulatedResult;
		}
		// 이미 품질이 좋은 컨텐츠가 있으면 중단
		if (accumulatedResult.content && this.isContentQualityGood(accumulatedResult.content, currentUrl.href)) {
			this.logger.debug('이미 품질이 좋은 컨텐츠가 추출되어 있으므로 핸들러 체인 중단');
			return accumulatedResult;
		}
		const [currentHandler, ...remainingHandlers] = handlers;
		this.logger.debug(
			`[DEBUG] ${currentHandler.constructor.name}.canHandle(${currentUrl.hostname}) = ${currentHandler.canHandle(currentUrl)}`,
		);
		if (!currentHandler.canHandle(currentUrl)) {
			return this.executeHandlerChainWithQualityCheck(remainingHandlers, currentUrl, accumulatedResult);
		}
		this.logger.debug(`핸들러 ${currentHandler.constructor.name}가 ${currentUrl.href} 처리`);
		try {
			const result = await currentHandler.handle(currentUrl);
			if (!result) {
				return this.executeHandlerChainWithQualityCheck(remainingHandlers, currentUrl, accumulatedResult);
			}
			const updatedResult = this.updateAccumulatedResult(accumulatedResult, result);
			// 컨텐츠가 추출되었으면 품질 평가
			if (result.content) {
				const quality = this.contentQualityEvaluator.evaluate(
					result.content,
					result.content,
					{},
					currentUrl.href,
				);
				this.logger.log(
					`핸들러 ${currentHandler.constructor.name} 품질 평가: chars=${quality.characterCount}, paragraphs=${quality.paragraphCount}, score=${quality.readabilityScore}, readable=${quality.isProbablyReadable}`,
				);
				if (quality.isProbablyReadable) {
					this.logger.log(`핸들러 ${currentHandler.constructor.name}가 품질 좋은 콘텐츠 추출 성공`);
					return updatedResult;
				} else {
					this.logger.debug(
						`핸들러 ${currentHandler.constructor.name}의 컨텐츠 품질이 낮음, 다음 핸들러 시도`,
					);
				}
			}
			return this.executeHandlerChainWithQualityCheck(remainingHandlers, currentUrl, updatedResult);
		} catch (error) {
			this.logger.warn(`핸들러 ${currentHandler.constructor.name} 처리 실패: ${(error as Error).message}`);
			return this.executeHandlerChainWithQualityCheck(remainingHandlers, currentUrl, accumulatedResult);
		}
	}

	/**
	 * 컨텐츠 품질이 좋은지 빠르게 판단합니다.
	 * @param content 컨텐츠
	 * @param url URL
	 * @returns boolean
	 */
	private isContentQualityGood(content: string, url: string): boolean {
		try {
			const quality = this.contentQualityEvaluator.evaluate(content, content, {}, url);
			return quality.isProbablyReadable;
		} catch (error) {
			this.logger.warn(`품질 평가 실패: ${(error as Error).message}`);
			return false;
		}
	}

	/**
	 * 누적 결과를 업데이트합니다.
	 * @param accumulated 기존 결과
	 * @param newResult 새 결과
	 * @returns 병합된 결과
	 */
	private updateAccumulatedResult(accumulated: PreHandleResult, newResult: PreHandleResult): PreHandleResult {
		return {
			url: newResult.url || accumulated.url,
			title: newResult.title || accumulated.title,
			content: newResult.content || accumulated.content,
			contentType: newResult.contentType || accumulated.contentType,
		};
	}
}
