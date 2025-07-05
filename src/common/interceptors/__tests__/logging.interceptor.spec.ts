import { LoggingInterceptor } from '../logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { Request } from 'express';

describe('LoggingInterceptor', () => {
	let interceptor: LoggingInterceptor;
	let mockContext: Partial<ExecutionContext>;
	let mockCallHandler: Partial<CallHandler>;
	let loggerSpy: any;

	beforeAll(() => {
		// process.hrtime.bigint mock (jest 환경에서 없을 수 있으므로)
		if (!process.hrtime || typeof process.hrtime.bigint !== 'function') {
			(process as any).hrtime = { bigint: jest.fn(() => BigInt(Date.now() * 1_000_000)) };
		}
	});

	afterAll(() => {
		// 테스트 종료 후 mock 제거
		if ((process as any).hrtime && (process as any).hrtime.bigint) {
			delete (process as any).hrtime;
		}
	});

	beforeEach(() => {
		interceptor = new LoggingInterceptor();
		mockContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({
					method: 'GET',
					url: '/test',
					ip: '127.0.0.1',
					connection: { remoteAddress: '127.0.0.2' },
					socket: { remoteAddress: '127.0.0.3' },
				}),
				getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
			}),
		} as any;
		mockCallHandler = {
			handle: jest.fn().mockReturnValue(of('response')),
		};
		// logger 메서드 spy
		loggerSpy = {
			log: jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => {}),
			warn: jest.spyOn(interceptor['logger'], 'warn').mockImplementation(() => {}),
			error: jest.spyOn(interceptor['logger'], 'error').mockImplementation(() => {}),
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('LoggingInterceptor 인스턴스가 정의되어야 한다', () => {
		expect(interceptor).toBeDefined();
	});

	it('정상 응답 시 log가 호출된다', (done) => {
		interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler).subscribe(() => {
			setImmediate(() => {
				expect(loggerSpy.log).toHaveBeenCalledWith('GET /test - 127.0.0.1');
				expect(loggerSpy.log).toHaveBeenCalledWith(expect.stringMatching(/^GET \/test - 200 - [\d.]+ms$/));
				done();
			});
		});
	});

	it('statusCode가 400 이상이면 warn이 호출된다', (done) => {
		mockContext.switchToHttp = jest.fn().mockReturnValue({
			getRequest: jest.fn().mockReturnValue({ method: 'POST', url: '/fail', ip: '1.1.1.1' }),
			getResponse: jest.fn().mockReturnValue({ statusCode: 404 }),
		});
		interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler).subscribe(() => {
			setImmediate(() => {
				expect(loggerSpy.warn).toHaveBeenCalled();
				done();
			});
		});
	});

	it('responseTime이 1000ms 초과면 warn이 호출된다', (done) => {
		// getNow를 spyOn하여 1001ms 차이가 나도록 mock
		const getNowSpy = jest.spyOn(interceptor as any, 'getNow');
		getNowSpy.mockReturnValueOnce(0).mockReturnValueOnce(1001);
		mockContext.switchToHttp = jest.fn().mockReturnValue({
			getRequest: jest.fn().mockReturnValue({
				method: 'GET',
				url: '/slow',
				ip: '1.1.1.1',
				connection: { remoteAddress: '1.1.1.2' },
				socket: { remoteAddress: '1.1.1.3' },
			}),
			getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
		});
		interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler).subscribe(() => {
			setImmediate(() => {
				expect(loggerSpy.warn).toHaveBeenCalled();
				getNowSpy.mockRestore();
				done();
			});
		});
	});

	it('에러 발생 시 error가 호출된다', (done) => {
		mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('fail')));
		interceptor.intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler).subscribe({
			error: () => {
				setImmediate(() => {
					expect(loggerSpy.error).toHaveBeenCalled();
					done();
				});
			},
		});
	});

	it('getClientIp가 ip, connection, socket, unknown 모두 정상 반환', () => {
		expect(interceptor['getClientIp']({ ip: '1.2.3.4' } as Request)).toBe('1.2.3.4');
		expect(interceptor['getClientIp']({ connection: { remoteAddress: '2.2.2.2' } } as unknown as Request)).toBe(
			'2.2.2.2',
		);
		expect(interceptor['getClientIp']({ socket: { remoteAddress: '3.3.3.3' } } as unknown as Request)).toBe(
			'3.3.3.3',
		);
		expect(interceptor['getClientIp']({} as Request)).toBe('unknown');
	});
});
