/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';

import { JwtService } from '@nestjs/jwt';
import { AuthController } from 'src/modules/auth/auth.controller';
import { TokenService } from 'src/modules/auth/services/token.service';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { AuthRequest } from 'src/types';

describe('AuthController', () => {
	let controller: AuthController;
	let tokenService: { generateTokenPair: jest.Mock; refreshTokens: jest.Mock; logout: jest.Mock };
	let authService: { validateUser: jest.Mock };
	let configService: { get: jest.Mock };
	let jwtService: { sign: jest.Mock; verify: jest.Mock };

	const mockUser: User = {
		id: '1',
		email: 'test@test.com',
		name: '테스트',
		provider: 'google',
		providerId: 'gid',
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(async () => {
		tokenService = {
			generateTokenPair: jest.fn(),
			refreshTokens: jest.fn(),
			logout: jest.fn(),
		};

		authService = {
			validateUser: jest.fn(),
		};

		configService = {
			get: jest.fn(),
		};

		jwtService = {
			sign: jest.fn(),
			verify: jest.fn(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [AuthController],
			providers: [
				{ provide: TokenService, useValue: tokenService },
				{ provide: AuthService, useValue: authService },
				{ provide: ConfigService, useValue: configService },
				{ provide: JwtService, useValue: jwtService },
			],
		}).compile();

		controller = module.get<AuthController>(AuthController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('googleCallback', () => {
		it('토큰을 생성하고 프론트엔드로 리다이렉트', async () => {
			const mockTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
			const mockReq = {
				user: mockUser,
			} as unknown as AuthRequest;
			const mockRes = {
				redirect: jest.fn(),
				cookie: jest.fn(),
			} as unknown as Response;

			configService.get.mockReturnValue('http://localhost:3000');
			tokenService.generateTokenPair.mockResolvedValue(mockTokens);

			await controller.googleCallback(mockReq, mockRes);

			expect(tokenService.generateTokenPair).toHaveBeenCalledWith(mockUser);
			expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:3000/dashboard');
		});

		it('유저가 없으면 에러 페이지로 리다이렉트', async () => {
			const mockReq = {
				user: undefined,
			} as unknown as AuthRequest;
			const mockRes = {
				redirect: jest.fn(),
				cookie: jest.fn(),
			} as unknown as Response;

			configService.get.mockReturnValue('http://localhost:3000');

			await controller.googleCallback(mockReq, mockRes);

			expect(mockRes.redirect).toHaveBeenCalledWith(
				'http://localhost:3000/auth/error?message=authentication_failed',
			);
		});
	});

	describe('refreshTokens', () => {
		it('리프레시 토큰으로 새 토큰 쌍을 생성', async () => {
			const mockReq = {
				cookies: {
					refresh_token: 'refresh-token',
				},
			} as unknown as AuthRequest;
			const mockRes = {
				json: jest.fn(() => mockRes),
				cookie: jest.fn(),
				clearCookie: jest.fn(),
			} as unknown as Response;

			const newTokens = { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' };
			tokenService.refreshTokens.mockResolvedValue(newTokens);

			await controller.refreshTokens(mockReq, mockRes);

			expect(tokenService.refreshTokens).toHaveBeenCalledWith('refresh-token');
			expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tokens refreshed successfully' });
		});

		it('리프레시 토큰이 없으면 401 반환', async () => {
			const mockReq = {
				cookies: {},
			} as unknown as AuthRequest;
			const mockRes = {
				status: jest.fn().mockReturnThis(),
				json: jest.fn(),
				cookie: jest.fn(),
				clearCookie: jest.fn(),
			} as unknown as Response;

			await controller.refreshTokens(mockReq, mockRes);

			expect(mockRes.status).toHaveBeenCalledWith(401);
			expect(mockRes.json).toHaveBeenCalledWith({ message: 'Refresh token not found' });
		});
	});

	describe('logout', () => {
		it('유저를 로그아웃하고 성공 메시지를 반환', async () => {
			const mockReq = {
				user: mockUser,
			} as unknown as AuthRequest;
			const mockRes = {
				json: jest.fn(() => mockRes),
				cookie: jest.fn(),
				clearCookie: jest.fn(),
			} as unknown as Response;

			tokenService.logout.mockResolvedValue(undefined);

			await controller.logout(mockReq, mockRes);

			expect(tokenService.logout).toHaveBeenCalledWith(mockUser.id);
			expect(mockRes.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
		});
	});
});
