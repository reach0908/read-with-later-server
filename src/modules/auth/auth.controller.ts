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

			// RefreshToken만 쿠키에 설정
			this.setRefreshTokenCookie(res, refreshToken);

			// AccessToken을 URL 파라미터로 전달 (임시)
			const clientUrl = this.configService.get<string>('app.CLIENT_URL');
			return res.redirect(`${clientUrl}/auth/callback?access_token=${accessToken}`);
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

			// 새로운 RefreshToken을 쿠키에 설정
			this.setRefreshTokenCookie(res, newRefreshToken);

			// AccessToken은 응답으로 반환
			return res.json({
				accessToken,
				message: 'Tokens refreshed successfully',
			});
		} catch {
			// RefreshToken 쿠키 삭제
			this.clearRefreshTokenCookie(res);
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

			// RefreshToken 쿠키 삭제
			this.clearRefreshTokenCookie(res);

			return res.json({ message: 'Logged out successfully' });
		} catch {
			// 에러가 있어도 쿠키는 삭제
			this.clearRefreshTokenCookie(res);
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

	private setRefreshTokenCookie(res: Response, refreshToken: string) {
		const isProduction = process.env.NODE_ENV === 'production';

		// RefreshToken만 쿠키에 저장
		res.cookie('refresh_token', refreshToken, {
			httpOnly: true, // XSS 공격 방지
			secure: isProduction, // HTTPS에서만 전송
			sameSite: 'lax', // CSRF 공격 방지
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
		});
	}

	private clearRefreshTokenCookie(res: Response) {
		res.clearCookie('refresh_token');
	}
}
