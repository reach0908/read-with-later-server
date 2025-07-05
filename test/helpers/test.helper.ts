import { of } from 'rxjs';

interface HttpMock {
	switchToHttp: () => {
		getRequest: () => Record<string, unknown>;
		getResponse: () => { statusCode: number };
	};
}

export const createMockExecutionContext = (request: Record<string, unknown> = {}): HttpMock => ({
	switchToHttp: () => ({
		getRequest: () => request,
		getResponse: () => ({ statusCode: 200 }),
	}),
});

export const createMockCallHandler = <T = unknown>(result: T = 'response' as unknown as T) => ({
	handle: () => of(result),
});
