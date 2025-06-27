import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/modules/auth/services/token.service';
import { PrismaService } from 'src/database/prisma.service';
import { UserService } from 'src/modules/user/user.service';
import { User } from '@prisma/client';
import { JwtPayload, TokenType } from 'src/types';
import authConfigType from 'src/config/auth.config';

describe('TokenService', () => {
	let service: TokenService;
	let jwtService: { sign: jest.Mock; verify: jest.Mock };
	let prismaService: {
		refreshToken: {
			findFirst: jest.Mock;
			deleteMany: jest.Mock;
			create: jest.Mock;
		};
		$transaction: jest.Mock;
	};
	let userService: { findByEmail: jest.Mock };
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

		prismaService = {
			refreshToken: {
				findFirst: jest.fn(),
				deleteMany: jest.fn(),
				create: jest.fn(),
			},
			$transaction: jest.fn((callback: (tx: typeof prismaService) => unknown) => callback(prismaService)),
		};

		userService = {
			findByEmail: jest.fn(),
		};

		authConfig = {
			JWT_ACCESS_EXPIRES_IN: '15m',
			JWT_REFRESH_EXPIRES_IN: '7d',
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TokenService,
				{ provide: JwtService, useValue: jwtService },
				{ provide: PrismaService, useValue: prismaService },
				{ provide: UserService, useValue: userService },
				{ provide: authConfigType.KEY, useValue: authConfig },
			],
		}).compile();

		service = module.get<TokenService>(TokenService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
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
			prismaService.refreshToken.deleteMany.mockResolvedValue(undefined);
			prismaService.refreshToken.create.mockResolvedValue(undefined);

			const result = await service.generateTokenPair(mockUser);

			expect(jwtService.sign).toHaveBeenCalledTimes(2);
			expect(prismaService.$transaction).toHaveBeenCalled();
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
			prismaService.refreshToken.findFirst.mockResolvedValue({ id: '1' });
			userService.findByEmail.mockResolvedValue(mockUser);
			jwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');
			prismaService.refreshToken.deleteMany.mockResolvedValue(undefined);
			prismaService.refreshToken.create.mockResolvedValue(undefined);

			const result = await service.refreshTokens(mockRefreshToken);

			expect(jwtService.verify).toHaveBeenCalledWith(mockRefreshToken);
			expect(prismaService.refreshToken.findFirst).toHaveBeenCalledWith({
				where: {
					userId: mockUser.id,
					token: mockRefreshToken,
					isValid: true,
				},
			});
			expect(userService.findByEmail).toHaveBeenCalledWith(mockUser.email);
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
			prismaService.refreshToken.findFirst.mockResolvedValue(null);

			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
			await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow('Invalid refresh token');
		});

		it('유저가 존재하지 않는 경우 UnauthorizedException을 던진다', async () => {
			jwtService.verify.mockReturnValue(mockJwtPayload);
			prismaService.refreshToken.findFirst.mockResolvedValue({ id: '1' });
			userService.findByEmail.mockResolvedValue(null);

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
	});

	describe('saveRefreshToken', () => {
		it('리프레시 토큰을 데이터베이스에 저장한다', async () => {
			prismaService.refreshToken.deleteMany.mockResolvedValue(undefined);
			prismaService.refreshToken.create.mockResolvedValue(undefined);

			await service.saveRefreshToken(mockUser.id, mockRefreshToken);

			expect(prismaService.$transaction).toHaveBeenCalled();
			expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
				where: { userId: mockUser.id },
			});
			expect(prismaService.refreshToken.create).toHaveBeenCalledWith({
				data: {
					token: mockRefreshToken,
					userId: mockUser.id,
					isValid: true,
					expiresAt: expect.any(Date) as Date,
				},
			});
		});
	});

	describe('removeRefreshToken', () => {
		it('특정 리프레시 토큰을 삭제한다', async () => {
			prismaService.refreshToken.deleteMany.mockResolvedValue(undefined);

			await service.removeRefreshToken(mockRefreshToken);

			expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
				where: { token: mockRefreshToken },
			});
		});
	});

	describe('logout', () => {
		it('유저의 모든 리프레시 토큰을 삭제한다', async () => {
			prismaService.refreshToken.deleteMany.mockResolvedValue(undefined);

			await service.logout(mockUser.id);

			expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
				where: { userId: mockUser.id },
			});
		});
	});
});
