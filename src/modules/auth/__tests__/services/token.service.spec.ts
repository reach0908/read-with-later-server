import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/modules/auth/services/token.service';
import { UserService } from 'src/modules/user/user.service';
import { User } from '@prisma/client';
import { JwtPayload, TokenType } from 'src/types';
import authConfigType from 'src/config/auth.config';
import { RefreshTokenRepository } from 'src/modules/auth/repositories/refresh-token.repository';

describe('TokenService', () => {
	let service: TokenService;
	let jwtService: { sign: jest.Mock; verify: jest.Mock };
	let refreshTokenRepository: {
		findFirst: jest.Mock;
		deleteMany: jest.Mock;
		create: jest.Mock;
		prisma: { $transaction: jest.Mock };
	};
	let userService: { getUserByEmail: jest.Mock };
	let authConfig: { JWT_ACCESS_EXPIRES_IN: string; JWT_REFRESH_EXPIRES_IN: string };

	const mockUser: User = {
		id: '1',
		email: 'test@test.com',
		name: '테스트',
		provider: 'google',
		providerId: 'gid',
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockAccessToken = 'access-token';
	const mockRefreshToken = 'refresh-token';

	beforeEach(async () => {
		jwtService = {
			sign: jest.fn(),
			verify: jest.fn(),
		};

		refreshTokenRepository = {
			findFirst: jest.fn(),
			deleteMany: jest.fn(),
			create: jest.fn(),
			prisma: {
				$transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
					callback(refreshTokenRepository),
				),
			},
		};

		userService = {
			getUserByEmail: jest.fn(),
		};

		authConfig = {
			JWT_ACCESS_EXPIRES_IN: '15m',
			JWT_REFRESH_EXPIRES_IN: '7d',
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TokenService,
				{ provide: JwtService, useValue: jwtService },
				{ provide: UserService, useValue: userService },
				{ provide: authConfigType.KEY, useValue: authConfig },
				{ provide: RefreshTokenRepository, useValue: refreshTokenRepository },
			],
		}).compile();

		service = module.get<TokenService>(TokenService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('TokenService 인스턴스가 정의되어야 한다', () => {
		expect(service).toBeDefined();
	});

	describe('generateAccessToken', () => {
		it('유저 정보로 액세스 토큰을 생성한다', () => {
			jwtService.sign.mockReturnValue(mockAccessToken);

			const result = service.generateAccessToken(mockUser);

			expect(jwtService.sign).toHaveBeenCalledWith(
				{
					sub: mockUser.id,
					email: mockUser.email,
					name: mockUser.name,
					type: TokenType.ACCESS,
				},
				{ expiresIn: '15m' },
			);
			expect(result).toBe(mockAccessToken);
		});
	});

	describe('generateRefreshToken', () => {
		it('유저 정보로 리프레시 토큰을 생성한다', () => {
			jwtService.sign.mockReturnValue(mockRefreshToken);

			const result = service.generateRefreshToken(mockUser);

			expect(jwtService.sign).toHaveBeenCalledWith(
				{
					sub: mockUser.id,
					email: mockUser.email,
					name: mockUser.name,
					type: TokenType.REFRESH,
				},
				{ expiresIn: '7d' },
			);
			expect(result).toBe(mockRefreshToken);
		});
	});

	describe('generateTokenPair', () => {
		it('액세스 토큰과 리프레시 토큰 쌍을 생성하고 저장한다', async () => {
			jwtService.sign.mockReturnValueOnce(mockAccessToken).mockReturnValueOnce(mockRefreshToken);
			refreshTokenRepository.prisma.$transaction.mockImplementation(
				async (cb: (tx: unknown) => Promise<unknown>) => {
					await cb(refreshTokenRepository);
				},
			);
			refreshTokenRepository.deleteMany.mockResolvedValue(undefined);
			refreshTokenRepository.create.mockResolvedValue(undefined);

			const result = await service.generateTokenPair(mockUser);

			expect(jwtService.sign).toHaveBeenCalledTimes(2);
			expect(refreshTokenRepository.prisma.$transaction).toHaveBeenCalled();
			expect(result).toEqual({
				accessToken: mockAccessToken,
				refreshToken: mockRefreshToken,
			});
		});
	});

	describe('refreshTokens', () => {
		const mockJwtPayload: JwtPayload = {
			sub: mockUser.id,
			email: mockUser.email,
			name: mockUser.name,
			type: TokenType.REFRESH,
		};

		it('유효한 리프레시 토큰으로 새로운 토큰 쌍을 생성한다', async () => {
			jwtService.verify.mockReturnValue(mockJwtPayload);
			refreshTokenRepository.findFirst.mockResolvedValue({ id: '1' });
			userService.getUserByEmail.mockResolvedValue(mockUser);
			jwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');
			refreshTokenRepository.prisma.$transaction.mockImplementation(
				async (cb: (tx: unknown) => Promise<unknown>) => {
					await cb(refreshTokenRepository);
				},
			);
			refreshTokenRepository.deleteMany.mockResolvedValue(undefined);
			refreshTokenRepository.create.mockResolvedValue(undefined);

			const result = await service.refreshTokens(mockRefreshToken);

			expect(jwtService.verify).toHaveBeenCalledWith(mockRefreshToken);
			expect(refreshTokenRepository.findFirst).toHaveBeenCalledWith({
				where: {
					userId: mockUser.id,
					token: mockRefreshToken,
					isValid: true,
				},
			});
			expect(userService.getUserByEmail).toHaveBeenCalledWith(mockUser.email);
			expect(result).toEqual({
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
			});
		});

		it('잘못된 토큰 타입인 경우 UnauthorizedException을 던진다', async () => {
			jwtService.verify.mockReturnValue({ ...mockJwtPayload, type: TokenType.ACCESS });

			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
		});

		it('저장된 리프레시 토큰이 없는 경우 UnauthorizedException을 던진다', async () => {
			jwtService.verify.mockReturnValue(mockJwtPayload);
			refreshTokenRepository.findFirst.mockResolvedValue(null);

			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
		});

		it('유저가 존재하지 않는 경우 UnauthorizedException을 던진다', async () => {
			jwtService.verify.mockReturnValue(mockJwtPayload);
			refreshTokenRepository.findFirst.mockResolvedValue({ id: '1' });
			userService.getUserByEmail.mockResolvedValue(null);

			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
		});

		it('JWT 검증 실패 시 UnauthorizedException을 던진다', async () => {
			jwtService.verify.mockImplementation(() => {
				throw new Error('Invalid token');
			});

			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
		});

		it('refreshToken이 undefined/null이면 UnauthorizedException을 던진다', async () => {
			await expect(service.refreshTokens(undefined as unknown as string)).rejects.toThrow(UnauthorizedException);
			await expect(service.refreshTokens(null as unknown as string)).rejects.toThrow(UnauthorizedException);
		});
	});

	describe('saveRefreshToken', () => {
		it('리프레시 토큰을 데이터베이스에 저장한다', async () => {
			refreshTokenRepository.prisma.$transaction.mockImplementation(
				async (cb: (tx: unknown) => Promise<unknown>) => {
					await cb(refreshTokenRepository);
				},
			);
			refreshTokenRepository.deleteMany.mockResolvedValue(undefined);
			refreshTokenRepository.create.mockResolvedValue(undefined);

			await service.saveRefreshToken(mockUser.id, mockRefreshToken);

			expect(refreshTokenRepository.prisma.$transaction).toHaveBeenCalled();
			expect(refreshTokenRepository.deleteMany).toHaveBeenCalledWith(
				{ where: { userId: mockUser.id } },
				refreshTokenRepository,
			);
			expect(refreshTokenRepository.create).toHaveBeenCalledWith(
				{
					token: mockRefreshToken,
					isValid: true,
					expiresAt: expect.any(Date),
					user: { connect: { id: mockUser.id } },
				},
				refreshTokenRepository,
			);
		});
	});

	describe('removeRefreshToken', () => {
		it('특정 리프레시 토큰을 삭제한다', async () => {
			refreshTokenRepository.deleteMany.mockResolvedValue(undefined);

			await service.removeRefreshToken(mockRefreshToken);

			expect(refreshTokenRepository.deleteMany).toHaveBeenCalledWith({ where: { token: mockRefreshToken } });
		});
	});

	describe('logout', () => {
		it('유저의 모든 리프레시 토큰을 삭제한다', async () => {
			refreshTokenRepository.deleteMany.mockResolvedValue(undefined);

			await service.logout(mockUser.id);

			expect(refreshTokenRepository.deleteMany).toHaveBeenCalledWith({ where: { userId: mockUser.id } });
		});
	});
});
