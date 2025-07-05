/**
 * 리팩토링된 PreHandlerService
 * - HandlerFactory 기반 함수형/전략 패턴 적용
 */
import { Injectable, Logger } from '@nestjs/common';
import { PreHandleResult } from './dto/pre-handle-result.dto';
import { HandlerFactory } from './factories/handler-factory';
import { IContentHandler } from './interfaces/content-handler.interface';

/**
 * 리팩토링된 PreHandlerService
 */
@Injectable()
export class RefactoredPreHandlerService {
	private readonly logger = new Logger(RefactoredPreHandlerService.name);

	constructor(private readonly handlerFactory: HandlerFactory) {}

	/**
	 * 핸들러 체인을 순차적으로 실행하여 결과를 반환합니다.
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
		const result = await this.executeHandlerChain(handlers, currentUrl, {
			url: urlString,
			title: undefined,
			content: undefined,
			contentType: undefined,
		});
		this.logger.debug(`리팩토링된 pre-handler 실행 완료. 최종 결과: url=${result.url}, title=${result.title}`);
		return result;
	}

	/**
	 * 핸들러 체인을 순차적으로 실행 (재귀적 함수형 접근)
	 * @param handlers 핸들러 배열
	 * @param currentUrl 현재 URL
	 * @param accumulatedResult 누적 결과
	 * @returns PreHandleResult
	 */
	private async executeHandlerChain(
		handlers: IContentHandler[],
		currentUrl: URL,
		accumulatedResult: PreHandleResult,
	): Promise<PreHandleResult> {
		if (handlers.length === 0) {
			return accumulatedResult;
		}
		if (accumulatedResult.content) {
			this.logger.debug('이미 content가 추출되어 있으므로 핸들러 체인 중단');
			return accumulatedResult;
		}
		const [currentHandler, ...remainingHandlers] = handlers;
		this.logger.debug(
			`[DEBUG] ${currentHandler.constructor.name}.canHandle(${currentUrl.hostname}) = ${currentHandler.canHandle(currentUrl)}`,
		);
		if (!currentHandler.canHandle(currentUrl)) {
			return this.executeHandlerChain(remainingHandlers, currentUrl, accumulatedResult);
		}
		this.logger.debug(`핸들러 ${currentHandler.constructor.name}가 ${currentUrl.href} 처리`);
		try {
			const result = await currentHandler.handle(currentUrl);
			if (!result) {
				return this.executeHandlerChain(remainingHandlers, currentUrl, accumulatedResult);
			}
			const updatedResult = this.updateAccumulatedResult(accumulatedResult, result);
			if (result.content) {
				this.logger.log(`핸들러 ${currentHandler.constructor.name}가 콘텐츠 추출 성공`);
				return updatedResult;
			}
			return this.executeHandlerChain(remainingHandlers, currentUrl, updatedResult);
		} catch (error) {
			this.logger.warn(`핸들러 ${currentHandler.constructor.name} 처리 실패: ${(error as Error).message}`);
			return this.executeHandlerChain(remainingHandlers, currentUrl, accumulatedResult);
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
