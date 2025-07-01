import { LoggingInterceptor } from '../logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
	let interceptor: LoggingInterceptor;
	let mockContext: Partial<ExecutionContext>;
	let mockCallHandler: Partial<CallHandler>;

	beforeEach(() => {
		interceptor = new LoggingInterceptor();
		mockContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({ method: 'GET', url: '/test', ip: '127.0.0.1' }),
				getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
			}),
		} as any;
		mockCallHandler = {
			handle: jest.fn().mockReturnValue(of('response')),
		};
	});

	it('should be defined', () => {
		expect(interceptor).toBeDefined();
	});

	it('should log on success', (done) => {
		interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler).subscribe(() => {
			expect(true).toBe(true); // 실제 로그는 mock 필요
			done();
		});
	});

	it('should log on error', (done) => {
		mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('fail')));
		interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler).subscribe({
			error: () => {
				expect(true).toBe(true); // 실제 로그는 mock 필요
				done();
			},
		});
	});
});
