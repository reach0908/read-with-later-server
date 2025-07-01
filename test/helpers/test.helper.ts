import { of } from 'rxjs';

export const createMockExecutionContext = (request: any = {}) => ({
	switchToHttp: () => ({
		getRequest: () => request,
		getResponse: () => ({ statusCode: 200 }),
	}),
});

export const createMockCallHandler = (result: any = 'response') => ({
	handle: () => of(result),
});
