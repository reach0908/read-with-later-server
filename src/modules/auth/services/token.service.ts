import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { JwtPayload, TokenPair } from '../../../types';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class TokenService {
	private readonly logger = new Logger(TokenService.name);

	constructor(
		private readonly jwtService: JwtService,
		private readonly prisma: PrismaService,
		private readonly userService: UserService,
	) {}

	generateAccessToken(user: User): string {
		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
			name: user.name,
			type: 'access',
		};
		this.logger.debug(`AccessToken 생성: ${user.email}`);
		return this.jwtService.sign(payload, {
			expiresIn: '15m',
		});
	}

	generateRefreshToken(user: User): string {
		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
			name: user.name,
			type: 'refresh',
		};
		this.logger.debug(`RefreshToken 생성: ${user.email}`);
		return this.jwtService.sign(payload, {
			expiresIn: '7d',
		});
	}

	async generateTokenPair(user: User): Promise<TokenPair> {
		const accessToken = this.generateAccessToken(user);
		const refreshToken = this.generateRefreshToken(user);
		await this.saveRefreshToken(user.id, refreshToken);
		this.logger.debug(`토큰 쌍 생성 및 저장: ${user.email}`);
		return { accessToken, refreshToken };
	}

	async refreshTokens(refreshToken: string): Promise<TokenPair> {
		try {
			const payload = this.jwtService.verify<JwtPayload>(refreshToken);
			if (payload.type !== 'refresh') {
				throw new UnauthorizedException('Invalid token type');
			}
			const storedToken = await this.prisma.refreshToken.findFirst({
				where: {
					userId: payload.sub,
					token: refreshToken,
					isValid: true,
					expiresAt: { gt: new Date() },
				},
			});
			if (!storedToken) {
				throw new UnauthorizedException('Invalid refresh token');
			}
			const user = await this.userService.findByEmail(payload.email);
			if (!user) {
				throw new UnauthorizedException('User not found');
			}
			await this.removeRefreshToken(refreshToken);
			this.logger.debug(`RefreshToken 갱신: ${payload.email}`);
			return await this.generateTokenPair(user);
		} catch (error: unknown) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
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
