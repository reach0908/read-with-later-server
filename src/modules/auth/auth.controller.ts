import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthRequest } from 'src/types';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { AuthService } from './services/auth.service';
import { setAccessTokenCookie, setRefreshTokenCookie, clearAllTokenCookies } from './utils/auth.util';
import { TokenService } from './services/token.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
	constructor(
		private readonly tokenService: TokenService,
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
	) {}

	@ApiOperation({ summary: 'Google login' })
	@Get('google')
	@UseGuards(AuthGuard('google'))
	googleLogin() {
		// Google OAuth 시작점
	}

	@ApiOperation({ summary: 'Google callback' })
	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	async googleCallback(@Req() req: AuthRequest, @Res() res: Response) {
		try {
			const user = req.user;

			if (!user) {
				// 인증 실패 시
				const clientUrl = this.configService.get<string>('app.CLIENT_URL');
				return res.redirect(`${clientUrl}/auth/error?message=authentication_failed`);
			}

			// 토큰 쌍 생성
			const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(user);

			// 두 토큰 모두 쿠키에 설정
			setAccessTokenCookie(res, accessToken);
			setRefreshTokenCookie(res, refreshToken);

			// 토큰 없이 클라이언트로 리다이렉트
			const clientUrl = this.configService.get<string>('app.CLIENT_URL');
			return res.redirect(`${clientUrl}/dashboard`);
		} catch {
			const clientUrl = this.configService.get<string>('app.CLIENT_URL');
			return res.redirect(`${clientUrl}/auth/error?message=server_error`);
		}
	}

	@ApiOperation({ summary: 'Refresh tokens' })
	@ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
	@ApiResponse({ status: 401, description: 'Refresh token not found' })
	@Post('refresh')
	async refreshTokens(@Req() req: AuthRequest, @Res() res: Response) {
		try {
			const refreshToken = req.cookies?.refresh_token;

			if (!refreshToken) {
				return res.status(401).json({ message: 'Refresh token not found' });
			}

			// 새로운 토큰 쌍 생성 (슬라이딩 윈도우)
			const { accessToken, refreshToken: newRefreshToken } = await this.tokenService.refreshTokens(refreshToken);

			// 두 토큰 모두 쿠키에 설정
			setAccessTokenCookie(res, accessToken);
			setRefreshTokenCookie(res, newRefreshToken);

			// 성공 메시지만 반환
			return res.json({
				message: 'Tokens refreshed successfully',
			});
		} catch {
			// 모든 토큰 쿠키 삭제
			clearAllTokenCookies(res);
			return res.status(401).json({ message: 'Invalid refresh token' });
		}
	}

	@ApiOperation({ summary: 'Logout' })
	@ApiResponse({ status: 200, description: 'Logged out successfully' })
	@ApiBearerAuth('access-token')
	@Post('logout')
	@UseGuards(JwtAuthGuard)
	async logout(@Req() req: AuthRequest, @Res() res: Response) {
		try {
			const user = req.user;

			if (user) {
				// 사용자의 모든 리프레시 토큰 삭제 (개선된 방식)
				await this.tokenService.logout(user.id);
			}

			// 모든 토큰 쿠키 삭제
			clearAllTokenCookies(res);

			return res.json({ message: 'Logged out successfully' });
		} catch {
			// 에러가 있어도 쿠키는 삭제
			clearAllTokenCookies(res);
			return res.json({ message: 'Logged out successfully' });
		}
	}

	@ApiOperation({ summary: 'Get user by JWT token' })
	@ApiResponse({ status: 200, description: 'User found' })
	@ApiBearerAuth('access-token')
	@Get('me')
	@UseGuards(JwtAuthGuard)
	me(@Req() req: AuthRequest) {
		return req.user;
	}
}
