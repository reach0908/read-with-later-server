import { JwtAuthGuard } from '../jwt.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TokenType } from 'src/types';

describe('JwtAuthGuard', () => {
	let guard: JwtAuthGuard;
	let jwtService: any;
	let authService: any;
	let context: Partial<ExecutionContext>;

	beforeEach(() => {
		jwtService = { verify: jest.fn() };
		authService = { validateUser: jest.fn() };
		guard = new JwtAuthGuard(jwtService, authService);
		context = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({ headers: { authorization: 'Bearer token' } }),
			}),
		} as any;
	});

	it('JwtAuthGuard 인스턴스가 정의되어야 한다', () => {
		expect(guard).toBeDefined();
	});

	it('Authorization 헤더가 없으면 UnauthorizedException을 던진다', async () => {
		(context.switchToHttp as jest.Mock).mockReturnValueOnce({ getRequest: () => ({ headers: {} }) });
		await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(UnauthorizedException);
	});

	it('Bearer 타입이 아닌 Authorization이면 UnauthorizedException을 던진다', async () => {
		(context.switchToHttp as jest.Mock).mockReturnValueOnce({
			getRequest: () => ({ headers: { authorization: 'Basic token' } }),
		});
		await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(UnauthorizedException);
	});

	it('jwtService.verify가 예외를 던지면 UnauthorizedException을 던진다', async () => {
		jwtService.verify = jest.fn(() => {
			throw new Error('fail');
		});
		await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow('Invalid access token');
	});

	it('토큰 타입이 ACCESS가 아니면 UnauthorizedException을 던진다', async () => {
		jwtService.verify = jest.fn(() => ({ type: TokenType.REFRESH, email: 'a' }));
		await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow('Invalid token type');
	});

	it('validateUser가 null을 반환하면 UnauthorizedException을 던진다', async () => {
		jwtService.verify = jest.fn(() => ({ type: TokenType.ACCESS, email: 'a' }));
		authService.validateUser = jest.fn().mockResolvedValue(null);
		await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow('Invalid access token');
	});

	it('정상적인 토큰이면 true를 반환하고 request.user에 유저를 할당한다', async () => {
		jwtService.verify = jest.fn(() => ({ type: TokenType.ACCESS, email: 'a' }));
		authService.validateUser = jest.fn().mockResolvedValue({ id: 1 });
		const req = { headers: { authorization: 'Bearer token' }, user: undefined };
		(context.switchToHttp as jest.Mock).mockReturnValueOnce({ getRequest: () => req });
		const result = await guard.canActivate(context as ExecutionContext);
		expect(result).toBe(true);
		expect(req.user).toEqual({ id: 1 });
	});
});
