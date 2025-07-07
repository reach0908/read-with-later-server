/**
 * 핸들러 팩토리
 * - 도메인별 핸들러를 DI 받아 URL에 따라 적절한 핸들러를 반환
 * - getAllHandlers()로 전체 핸들러 배열 반환
 */
import { Inject, Injectable } from '@nestjs/common';
import { IContentHandler, CONTENT_HANDLER_TOKEN } from '../interfaces/content-handler.interface';

/**
 * 핸들러 팩토리 클래스
 *
 * @description
 * NestJS의 Custom Provider와 Injection Token을 사용하여 모든 핸들러를 동적으로 주입받습니다.
 * 이를 통해 새로운 핸들러가 추가되어도 팩토리 코드를 수정할 필요가 없으므로
 * OCP(개방-폐쇄 원칙)를 준수합니다. 핸들러의 실행 순서는 pre-handler.module.ts에서 관리됩니다.
 */
@Injectable()
export class HandlerFactory {
	constructor(
		@Inject(CONTENT_HANDLER_TOKEN)
		private readonly handlerChain: IContentHandler[],
	) {}

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
