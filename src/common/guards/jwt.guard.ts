import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { TokenService } from 'src/modules/auth/services/token.service';
import { JwtPayload } from 'src/types';

interface AuthenticatedRequest extends Request {
	user?: any;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		private readonly tokenService: TokenService,
		private readonly authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const response = context.switchToHttp().getResponse<Response>();

		// Access Token을 쿠키에서 추출
		const accessToken = request.cookies?.access_token as string;
		const refreshToken = request.cookies?.refresh_token as string;

		// Access Token이 없으면 거부
		if (!accessToken) {
			throw new UnauthorizedException('No access token provided');
		}

		try {
			// Access Token 검증
			const payload = this.jwtService.verify<JwtPayload>(accessToken);

			if (payload.type !== 'access') {
				throw new UnauthorizedException('Invalid token type');
			}

			// 사용자 정보를 request에 추가
			const user = await this.authService.validateUser(payload.email);
			request.user = user;

			return true;
		} catch {
			// Access Token이 만료된 경우, Refresh Token으로 갱신 시도
			if (refreshToken) {
				try {
					const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
						await this.tokenService.refreshTokens(refreshToken);

					// 새로운 토큰들을 쿠키에 설정
					this.setAccessTokenCookie(response, newAccessToken);
					this.setRefreshTokenCookie(response, newRefreshToken);

					// 새로운 Access Token으로 사용자 정보 추출
					const payload = this.jwtService.verify<JwtPayload>(newAccessToken);
					const user = await this.authService.validateUser(payload.email);
					request.user = user;

					return true;
				} catch {
					// Refresh Token도 유효하지 않으면 쿠키 삭제
					this.clearAuthCookies(response);
					throw new UnauthorizedException('Invalid refresh token');
				}
			}

			throw new UnauthorizedException('Invalid access token');
		}
	}

	private setAccessTokenCookie(res: Response, accessToken: string): void {
		const isProduction = process.env.NODE_ENV === 'production';

		res.cookie('access_token', accessToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: 'lax',
			maxAge: 15 * 60 * 1000, // 15분
		});
	}

	private setRefreshTokenCookie(res: Response, refreshToken: string): void {
		const isProduction = process.env.NODE_ENV === 'production';

		res.cookie('refresh_token', refreshToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
		});
	}

	private clearAuthCookies(res: Response): void {
		res.clearCookie('access_token');
		res.clearCookie('refresh_token');
	}
}
