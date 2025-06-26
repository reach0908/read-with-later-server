import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { AuthService } from './auth.service';

interface AuthenticatedRequest extends Request {
	user?: User;
}

@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
	) {}

	@Get('google')
	@UseGuards(AuthGuard('google'))
	googleLogin() {
		// Google OAuth 시작점
	}

	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	async googleCallback(@Req() req: AuthenticatedRequest, @Res() res: Response) {
		try {
			const user = req.user;

			if (!user) {
				// 인증 실패 시
				const clientUrl = this.configService.get<string>('app.CLIENT_URL');
				return res.redirect(`${clientUrl}/auth/error?message=authentication_failed`);
			}

			// 토큰 쌍 생성
			const { accessToken, refreshToken } = await this.authService.generateTokenPair(user);

			// 두 토큰 모두 쿠키에 설정
			this.setAccessTokenCookie(res, accessToken);
			this.setRefreshTokenCookie(res, refreshToken);

			// 토큰 없이 클라이언트로 리다이렉트
			const clientUrl = this.configService.get<string>('app.CLIENT_URL');
			return res.redirect(`${clientUrl}/auth/callback`);
		} catch {
			const clientUrl = this.configService.get<string>('app.CLIENT_URL');
			return res.redirect(`${clientUrl}/auth/error?message=server_error`);
		}
	}

	@Post('refresh')
	async refreshTokens(@Req() req: Request, @Res() res: Response) {
		try {
			const refreshToken = req.cookies?.refresh_token as string;

			if (!refreshToken) {
				return res.status(401).json({ message: 'Refresh token not found' });
			}

			// 새로운 토큰 쌍 생성 (슬라이딩 윈도우)
			const { accessToken, refreshToken: newRefreshToken } = await this.authService.refreshTokens(refreshToken);

			// 두 토큰 모두 쿠키에 설정
			this.setAccessTokenCookie(res, accessToken);
			this.setRefreshTokenCookie(res, newRefreshToken);

			// 성공 메시지만 반환
			return res.json({
				message: 'Tokens refreshed successfully',
			});
		} catch {
			// 모든 토큰 쿠키 삭제
			this.clearAllTokenCookies(res);
			return res.status(401).json({ message: 'Invalid refresh token' });
		}
	}

	@Post('logout')
	async logout(@Req() req: Request, @Res() res: Response) {
		try {
			const refreshToken = req.cookies?.refresh_token as string;

			if (refreshToken) {
				// DB에서 토큰 무효화
				await this.authService.invalidateRefreshToken(refreshToken);
			}

			// 모든 토큰 쿠키 삭제
			this.clearAllTokenCookies(res);

			return res.json({ message: 'Logged out successfully' });
		} catch {
			// 에러가 있어도 쿠키는 삭제
			this.clearAllTokenCookies(res);
			return res.json({ message: 'Logged out successfully' });
		}
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	getCurrentUser(@Req() req: AuthenticatedRequest) {
		// JWT Guard에서 처리된 사용자 정보 반환
		return {
			user: req.user,
			message: 'User authenticated successfully',
		};
	}

	private setAccessTokenCookie(res: Response, accessToken: string) {
		const isProduction = process.env.NODE_ENV === 'production';

		// AccessToken을 쿠키에 저장
		res.cookie('access_token', accessToken, {
			httpOnly: true, // XSS 공격 방지
			secure: isProduction, // HTTPS에서만 전송
			sameSite: 'lax', // CSRF 공격 방지
			maxAge: 15 * 60 * 1000, // 15분
		});
	}

	private setRefreshTokenCookie(res: Response, refreshToken: string) {
		const isProduction = process.env.NODE_ENV === 'production';

		// RefreshToken을 쿠키에 저장
		res.cookie('refresh_token', refreshToken, {
			httpOnly: true, // XSS 공격 방지
			secure: isProduction, // HTTPS에서만 전송
			sameSite: 'lax', // CSRF 공격 방지
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
		});
	}

	private clearAllTokenCookies(res: Response) {
		res.clearCookie('access_token');
		res.clearCookie('refresh_token');
	}
}
