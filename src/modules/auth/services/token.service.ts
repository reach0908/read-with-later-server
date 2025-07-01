import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { ConfigType } from '@nestjs/config';

import { PrismaService } from 'src/database/prisma.service';
import { UserService } from 'src/modules/user/user.service';

import authConfigType from 'src/config/auth.config';

import { JwtPayload, TokenPair, TokenType } from 'src/types';

@Injectable()
export class TokenService {
	private readonly logger = new Logger(TokenService.name);

	constructor(
		@Inject(authConfigType.KEY)
		private readonly configService: ConfigType<typeof authConfigType>,
		private readonly jwtService: JwtService,
		private readonly prisma: PrismaService,
		private readonly userService: UserService,
	) {}

	/**
	 * Generate access token
	 * @param user
	 * @returns access token
	 */
	generateAccessToken(user: User): string {
		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
			name: user.name,
			type: TokenType.ACCESS,
		};

		return this.jwtService.sign(payload, {
			expiresIn: this.configService.JWT_ACCESS_EXPIRES_IN,
		});
	}

	/**
	 * Generate refresh token
	 * @param user
	 * @returns refresh token
	 */
	generateRefreshToken(user: User): string {
		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
			name: user.name,
			type: TokenType.REFRESH,
		};

		return this.jwtService.sign(payload, {
			expiresIn: this.configService.JWT_REFRESH_EXPIRES_IN,
		});
	}

	/**
	 * Generate token pair
	 * @param user
	 * @returns token pair
	 */
	async generateTokenPair(user: User): Promise<TokenPair> {
		const accessToken = this.generateAccessToken(user);
		const refreshToken = this.generateRefreshToken(user);

		await this.saveRefreshToken(user.id, refreshToken);

		return { accessToken, refreshToken };
	}

	/**
	 * Refresh Token Pair
	 * @param refreshToken
	 * @returns token pair
	 */
	async refreshTokens(refreshToken: string): Promise<TokenPair> {
		try {
			const payload = this.jwtService.verify<JwtPayload>(refreshToken);

			if (payload.type !== TokenType.REFRESH) {
				throw new UnauthorizedException('Invalid refresh token');
			}

			const storedToken = await this.prisma.refreshToken.findFirst({
				where: {
					userId: payload.sub,
					token: refreshToken,
					isValid: true,
				},
			});

			if (!storedToken) {
				throw new UnauthorizedException('Invalid refresh token');
			}

			const user = await this.userService.getUserByEmail(payload.email);
			if (!user) {
				throw new UnauthorizedException('Invalid refresh token');
			}

			await this.removeRefreshToken(refreshToken);
			return await this.generateTokenPair(user);
		} catch (error: unknown) {
			// 디버깅을 위한 로그만 남기고, 클라이언트에는 일관된 메시지 반환
			this.logger.debug('Token refresh failed', error);
			throw new UnauthorizedException('Invalid refresh token');
		}
	}

	async saveRefreshToken(userId: string, token: string): Promise<void> {
		await this.prisma.$transaction(async (tx) => {
			await tx.refreshToken.deleteMany({ where: { userId } });
			await tx.refreshToken.create({
				data: {
					userId,
					token,
					isValid: true,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				},
			});
		});
		this.logger.debug(`RefreshToken 저장: ${userId}`);
	}

	async removeRefreshToken(token: string): Promise<void> {
		await this.prisma.refreshToken.deleteMany({ where: { token } });
		this.logger.debug(`RefreshToken 삭제: ${token}`);
	}

	async logout(userId: string): Promise<void> {
		await this.prisma.refreshToken.deleteMany({ where: { userId } });
		this.logger.debug(`모든 RefreshToken 삭제(로그아웃): ${userId}`);
	}
}
