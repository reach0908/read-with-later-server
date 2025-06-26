import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { UserService } from 'src/modules/user/user.service';
import { PrismaService } from 'src/database/prisma.service';

export interface JwtPayload {
	sub: string;
	email: string;
	name?: string | null;
	type: 'access' | 'refresh';
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
}

export interface GoogleProfile {
	emails?: Array<{ value: string; verified?: boolean }>;
	displayName?: string;
	photos?: Array<{ value: string }>;
	id: string;
	provider: string;
}

@Injectable()
export class AuthService {
	constructor(
		private readonly userService: UserService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private readonly prisma: PrismaService,
	) {}

	async validateUser(email: User['email']) {
		const user = await this.userService.findByEmail(email);
		if (!user) {
			throw new NotFoundException('Invalid credentials');
		}
		return user;
	}

	generateAccessToken(user: User): string {
		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
			name: user.name,
			type: 'access',
		};

		return this.jwtService.sign(payload, {
			expiresIn: '15m', // 짧은 만료 시간
		});
	}

	generateRefreshToken(user: User): string {
		const payload: JwtPayload = {
			sub: user.id,
			email: user.email,
			name: user.name,
			type: 'refresh',
		};

		return this.jwtService.sign(payload, {
			expiresIn: '7d', // 긴 만료 시간
		});
	}

	async generateTokenPair(user: User): Promise<TokenPair> {
		const accessToken = this.generateAccessToken(user);
		const refreshToken = this.generateRefreshToken(user);

		// RefreshToken을 DB에 저장 (해시화해서 저장)
		await this.saveRefreshToken(user.id, refreshToken);

		return {
			accessToken,
			refreshToken,
		};
	}

	async refreshTokens(refreshToken: string): Promise<TokenPair> {
		try {
			// RefreshToken 검증
			const payload = this.jwtService.verify<JwtPayload>(refreshToken);

			if (payload.type !== 'refresh') {
				throw new UnauthorizedException('Invalid token type');
			}

			// DB에서 토큰 확인
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

			// 사용자 정보 조회
			const user = await this.userService.findByEmail(payload.email);
			if (!user) {
				throw new UnauthorizedException('User not found');
			}

			// 기존 RefreshToken 무효화
			await this.invalidateRefreshToken(refreshToken);

			// 새로운 토큰 쌍 생성 (슬라이딩 윈도우)
			return await this.generateTokenPair(user);
		} catch {
			throw new UnauthorizedException('Invalid refresh token');
		}
	}

	async saveRefreshToken(userId: string, token: string): Promise<void> {
		// 기존 유효한 토큰들 무효화
		await this.prisma.refreshToken.updateMany({
			where: {
				userId,
				isValid: true,
			},
			data: {
				isValid: false,
			},
		});

		// 새 토큰 저장
		await this.prisma.refreshToken.create({
			data: {
				userId,
				token,
				isValid: true,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
			},
		});
	}

	async invalidateRefreshToken(token: string): Promise<void> {
		await this.prisma.refreshToken.updateMany({
			where: {
				token,
			},
			data: {
				isValid: false,
			},
		});
	}

	async logout(userId: string): Promise<void> {
		// 사용자의 모든 RefreshToken 무효화
		await this.prisma.refreshToken.updateMany({
			where: {
				userId,
				isValid: true,
			},
			data: {
				isValid: false,
			},
		});
	}

	async handleGoogleLogin(profile: GoogleProfile): Promise<User | null> {
		// Google 프로필에서 사용자 정보를 추출
		const email = profile.emails?.[0]?.value;
		const name = profile.displayName || null;

		if (!email) {
			throw new Error('Google profile does not contain email');
		}

		// 기존 사용자를 찾거나 새로 생성
		let user = await this.userService.findByEmail(email);

		if (!user) {
			// 새로운 사용자 생성
			user = await this.userService.createUser({
				email,
				name,
				provider: 'google',
				providerId: profile.id,
			});
		}

		return user;
	}
}
