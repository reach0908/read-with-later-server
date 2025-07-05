import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../jwt.guard';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { TokenType } from 'src/types';

describe('JwtAuthGuard', () => {
	let guard: JwtAuthGuard;
	let jwtService: jest.Mocked<JwtService>;
	let authService: jest.Mocked<AuthService>;
	let context: ExecutionContext;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				JwtAuthGuard,
				{
					provide: JwtService,
					useValue: {
						verify: jest.fn(),
					},
				},
				{
					provide: AuthService,
					useValue: {
						validateUser: jest.fn(),
					},
				},
			],
		}).compile();

		guard = module.get<JwtAuthGuard>(JwtAuthGuard);
		jwtService = module.get(JwtService);
		authService = module.get(AuthService);

		context = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue({
					headers: { authorization: 'Bearer valid-token' },
				}),
			}),
		} as unknown as ExecutionContext;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('JwtAuthGuard 인스턴스가 정의되어야 한다', () => {
		expect(guard).toBeDefined();
	});

	describe('canActivate', () => {
		it('Authorization 헤더가 없으면 UnauthorizedException을 던진다', async () => {
			const contextWithoutAuth = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue({ headers: {} }),
				}),
			} as unknown as ExecutionContext;
			await expect(guard.canActivate(contextWithoutAuth)).rejects.toThrow(UnauthorizedException);
		});

		it('Bearer 타입이 아닌 Authorization이면 UnauthorizedException을 던진다', async () => {
			const contextWithBasicAuth = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue({
						headers: { authorization: 'Basic token' },
					}),
				}),
			} as unknown as ExecutionContext;
			await expect(guard.canActivate(contextWithBasicAuth)).rejects.toThrow(UnauthorizedException);
		});

		it('jwtService.verify가 예외를 던지면 UnauthorizedException을 던진다', async () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('JWT verification failed');
			});
			await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
			await expect(guard.canActivate(context)).rejects.toThrow('Invalid access token');
		});

		it('토큰 타입이 ACCESS가 아니면 UnauthorizedException을 던진다', async () => {
			jwtService.verify.mockReturnValue({
				type: TokenType.REFRESH,
				email: 'test@example.com',
				sub: '1',
			});
			await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
			await expect(guard.canActivate(context)).rejects.toThrow('Invalid token type');
		});

		it('validateUser가 null을 반환하면 UnauthorizedException을 던진다', async () => {
			jwtService.verify.mockReturnValue({
				type: TokenType.ACCESS,
				email: 'test@example.com',
				sub: '1',
			});
			authService.validateUser.mockRejectedValue(new UnauthorizedException('Invalid access token'));
			await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
			await expect(guard.canActivate(context)).rejects.toThrow('Invalid access token');
		});

		it('정상적인 토큰이면 true를 반환하고 request.user에 유저를 할당한다', async () => {
			const mockUser = {
				id: '1',
				email: 'test@example.com',
				name: null,
				provider: 'google',
				providerId: 'gid',
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			const mockRequest = {
				headers: { authorization: 'Bearer valid-token' },
				user: undefined,
			};
			jwtService.verify.mockReturnValue({
				type: TokenType.ACCESS,
				email: 'test@example.com',
				sub: '1',
			});
			authService.validateUser.mockResolvedValue(mockUser);
			const contextWithRequest = {
				switchToHttp: jest.fn().mockReturnValue({
					getRequest: jest.fn().mockReturnValue(mockRequest),
				}),
			} as unknown as ExecutionContext;
			const result = await guard.canActivate(contextWithRequest);
			expect(result).toBe(true);
			expect(mockRequest.user).toEqual(mockUser);
			expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
			expect(authService.validateUser).toHaveBeenCalledWith('test@example.com');
		});
	});
});
