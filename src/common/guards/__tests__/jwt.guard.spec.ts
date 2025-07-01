import { JwtAuthGuard } from '../jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
	let guard: JwtAuthGuard;
	let jwtService: JwtService;
	let authService: AuthService;
	let context: Partial<ExecutionContext>;

	beforeEach(() => {
		jwtService = { verify: jest.fn() } as any;
		authService = { validateUser: jest.fn() } as any;
		guard = new JwtAuthGuard(jwtService, authService);
		context = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({ headers: { authorization: 'Bearer token' } }),
			}),
		} as any;
	});

	it('should be defined', () => {
		expect(guard).toBeDefined();
	});

	it('should throw if no token', async () => {
		(context.switchToHttp as jest.Mock).mockReturnValueOnce({ getRequest: () => ({ headers: {} }) });
		await expect(guard.canActivate(context as ExecutionContext)).rejects.toThrow(UnauthorizedException);
	});

	// 추가적으로 토큰 타입, 유효성, 사용자 검증 등 다양한 시나리오를 mock으로 테스트할 수 있습니다.
});
