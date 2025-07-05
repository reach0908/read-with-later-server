import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '../logging.interceptor';
import { Request } from 'express';

describe('LoggingInterceptor', () => {
	let interceptor: LoggingInterceptor;
	let context: ExecutionContext;
	let callHandler: CallHandler;
	let mockRequest: Partial<Request>;
	let mockResponse: any;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [LoggingInterceptor],
		}).compile();

		interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);

		mockRequest = {
			method: 'GET',
			url: '/test',
			ip: '127.0.0.1',
			connection: { remoteAddress: '127.0.0.2', destroySoon: () => {} } as unknown as import('net').Socket,
			socket: { remoteAddress: '127.0.0.3', destroySoon: () => {} } as unknown as import('net').Socket,
		};

		mockResponse = {
			statusCode: 200,
		};

		context = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
				getResponse: jest.fn().mockReturnValue(mockResponse),
			}),
		} as unknown as ExecutionContext;

		callHandler = {
			handle: jest.fn().mockReturnValue(of('response')),
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('LoggingInterceptor 인스턴스가 정의되어야 한다', () => {
		expect(interceptor).toBeDefined();
	});

	describe('intercept', () => {
		it('정상 응답 시 로그가 기록된다', (done) => {
			const logSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {});
			interceptor.intercept(context, callHandler).subscribe({
				next: () => {
					expect(logSpy).toHaveBeenCalledWith('GET /test - 127.0.0.1');
					expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^GET \/test - 200 - [\d.]+ms$/));
					logSpy.mockRestore();
					done();
				},
			});
		});

		it('statusCode가 400 이상이면 warn이 호출된다', (done) => {
			mockResponse.statusCode = 404;
			const warnSpy = jest.spyOn(interceptor['logger'], 'warn').mockImplementation(() => {});
			interceptor.intercept(context, callHandler).subscribe({
				next: () => {
					expect(warnSpy).toHaveBeenCalled();
					warnSpy.mockRestore();
					done();
				},
			});
		});

		it('responseTime이 1000ms 초과면 warn이 호출된다', (done) => {
			const warnSpy = jest.spyOn(interceptor['logger'], 'warn').mockImplementation(() => {});
			const getNowSpy = jest.spyOn(interceptor as any, 'getNow');
			getNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(1001);
			interceptor.intercept(context, callHandler).subscribe({
				next: () => {
					expect(warnSpy).toHaveBeenCalled();
					getNowSpy.mockRestore();
					warnSpy.mockRestore();
					done();
				},
			});
		});

		it('에러 발생 시 error가 호출된다', (done) => {
			const errorSpy = jest.spyOn(interceptor['logger'], 'error').mockImplementation(() => {});
			callHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('Test error')));
			interceptor.intercept(context, callHandler).subscribe({
				error: () => {
					expect(errorSpy).toHaveBeenCalled();
					errorSpy.mockRestore();
					done();
				},
			});
		});
	});

	describe('getClientIp', () => {
		it('ip가 있으면 ip를 반환한다', () => {
			const request = { ip: '1.2.3.4' } as Request;
			const result = interceptor['getClientIp'](request);
			expect(result).toBe('1.2.3.4');
		});

		it('connection.remoteAddress가 있으면 connection.remoteAddress를 반환한다', () => {
			const request = { connection: { remoteAddress: '2.2.2.2' } } as unknown as Request;
			const result = interceptor['getClientIp'](request);
			expect(result).toBe('2.2.2.2');
		});

		it('socket.remoteAddress가 있으면 socket.remoteAddress를 반환한다', () => {
			const request = { socket: { remoteAddress: '3.3.3.3' } } as unknown as Request;
			const result = interceptor['getClientIp'](request);
			expect(result).toBe('3.3.3.3');
		});

		it('IP 정보가 없으면 unknown을 반환한다', () => {
			const request = {} as Request;
			const result = interceptor['getClientIp'](request);
			expect(result).toBe('unknown');
		});
	});
});
