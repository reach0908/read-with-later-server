/**
 * Pre-Handler Service
 * - HandlerFactory를 사용하여 URL에 맞는 콘텐츠 처리 전략을 실행합니다.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PreHandleResult } from './dto/pre-handle-result.dto';
import { HandlerFactory } from './factories/handler-factory';
import { ContentQualityEvaluator } from '../scraper/services/content-quality-evaluator';

/**
 * 콘텐츠 사전 처리 서비스
 * - 핸들러 체인을 순차적으로 실행하여 URL에서 콘텐츠를 추출하고 정제합니다.
 */
@Injectable()
export class PreHandlerService {
	private readonly logger = new Logger(PreHandlerService.name);

	constructor(
		private readonly handlerFactory: HandlerFactory,
		private readonly contentQualityEvaluator: ContentQualityEvaluator,
	) {}

	/**
	 * 핸들러 체인을 순차적으로 실행하여 결과를 반환합니다.
	 * 품질 좋은 콘텐츠를 추출한 첫 번째 핸들러의 결과를 즉시 반환합니다.
	 * @param urlString 처리할 URL 문자열
	 * @returns PreHandleResult
	 */
	public async execute(urlString: string): Promise<PreHandleResult> {
		const handlers = this.handlerFactory.getAllHandlers();
		const initialUrl = new URL(urlString);

		this.logger.debug(`Pre-handler 실행 시작: ${urlString}`);
		this.logger.debug(`실행할 핸들러 순서: ${handlers.map((h) => h.constructor.name).join(' -> ')}`);

		for (const handler of handlers) {
			if (!handler.canHandle(initialUrl)) {
				continue;
			}

			this.logger.debug(`핸들러 [${handler.constructor.name}] 실행: ${initialUrl.href}`);
			try {
				const result = await handler.handle(initialUrl);

				if (result) {
					// 성공 조건 1: PDF, RSS 등 최종 콘텐츠 타입을 식별한 경우 즉시 반환
					if (result.contentType && !['text/html', 'text/plain'].includes(result.contentType)) {
						this.logger.log(
							`[${handler.constructor.name}] 핸들러가 최종 콘텐츠 타입(${result.contentType}) 식별 성공. 체인 중단.`,
						);
						result.handlerUsed = handler.constructor.name;
						return result;
					}

					// 성공 조건 2: 품질 좋은 HTML 콘텐츠를 추출한 경우 즉시 반환
					if (result.content && this.isContentQualityGood(result.content, result.url)) {
						this.logger.log(
							`[${handler.constructor.name}] 핸들러가 품질 좋은 콘텐츠 추출 성공. 체인 중단.`,
						);
						result.handlerUsed = handler.constructor.name;
						return result;
					}

					this.logger.debug(
						`[${handler.constructor.name}] 핸들러가 결과를 반환했으나 최종 성공 조건에 미치지 못함. 다음 핸들러 실행.`,
					);
				}
			} catch (error) {
				this.logger.warn(`[${handler.constructor.name}] 핸들러 처리 실패: ${(error as Error).message}`);
			}
		}

		this.logger.warn(`모든 핸들러가 콘텐츠 추출에 실패했습니다: ${urlString}`);
		return {
			url: urlString,
			title: undefined,
			content: undefined,
			contentType: undefined,
		};
	}

	/**
	 * 콘텐츠 품질이 좋은지 빠르게 판단합니다.
	 * @param content 콘텐츠
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
}
