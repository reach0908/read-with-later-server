import { Inject, Injectable, Logger } from '@nestjs/common';
import { CONTENT_HANDLER_TOKEN, IContentHandler } from './interfaces/content-handler.interface';
import { PreHandleResult } from './dto/pre-handle-result.dto';

/**
 * Orchestrates the content pre-handling process by iterating through a chain of registered handlers.
 */
@Injectable()
export class PreHandlerService {
	private readonly logger = new Logger(PreHandlerService.name);

	/**
	 * Injects all services that are provided with the `CONTENT_HANDLER_TOKEN`.
	 * @param handlers - An array of `IContentHandler` implementations.
	 */
	constructor(
		@Inject(CONTENT_HANDLER_TOKEN)
		private readonly handlers: IContentHandler[],
	) {}

	/**
	 * Executes the handler chain for a given URL.
	 * It tries handlers one by one until one successfully returns a result with content.
	 * @param urlString - The URL to process.
	 * @returns A `PreHandleResult`. If all handlers fail, it returns the original URL.
	 */
	public async execute(urlString: string): Promise<PreHandleResult> {
		let currentUrl = new URL(urlString);
		const finalResult: PreHandleResult = { url: urlString };

		for (const handler of this.handlers) {
			if (handler.canHandle(currentUrl)) {
				this.logger.debug(`Attempting to use handler: ${handler.constructor.name}`);
				const result = await handler.handle(currentUrl);

				if (result) {
					// URL이 핸들러에 의해 변경되었는지 확인하고 업데이트합니다.
					if (result.url && result.url !== currentUrl.href) {
						this.logger.debug(`URL transformed by ${handler.constructor.name} to: ${result.url}`);
						currentUrl = new URL(result.url);
						finalResult.url = result.url;
					}

					// 콘텐츠가 성공적으로 추출되면 즉시 반환합니다.
					if (result.content) {
						this.logger.log(`Successfully handled by ${handler.constructor.name}`);
						finalResult.title = result.title;
						finalResult.content = result.content;
						finalResult.contentType = result.contentType;
						return finalResult;
					}
				}
			}
		}

		this.logger.debug('No suitable handler found. Returning final result.');
		return finalResult; // 콘텐츠가 없더라도, 변환된 URL이 포함될 수 있는 최종 결과를 반환합니다.
	}
}
