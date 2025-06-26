import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { AuthService, JwtPayload } from 'src/modules/auth/auth.service';

interface AuthenticatedRequest extends Request {
	user?: any;
	newAccessToken?: string; // 자동 갱신된 새로운 AccessToken
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		private readonly authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const response = context.switchToHttp().getResponse<Response>();

		// Authorization 헤더에서 AccessToken 추출
		const authorization = request.headers.authorization;
		const accessToken = authorization?.startsWith('Bearer ') ? authorization.substring(7) : null;

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
						await this.authService.refreshTokens(refreshToken);

					// 새로운 RefreshToken을 쿠키에 설정
					this.setRefreshTokenCookie(response, newRefreshToken);

					// 새로운 AccessToken을 응답 헤더에 추가
					response.setHeader('X-New-Access-Token', newAccessToken);

					// 새로운 Access Token으로 사용자 정보 추출
					const payload = this.jwtService.verify<JwtPayload>(newAccessToken);
					const user = await this.authService.validateUser(payload.email);
					request.user = user;
					request.newAccessToken = newAccessToken;

					return true;
				} catch {
					// Refresh Token도 유효하지 않으면 쿠키 삭제
					this.clearRefreshTokenCookie(response);
					throw new UnauthorizedException('Invalid refresh token');
				}
			}

			throw new UnauthorizedException('Invalid access token');
		}
	}

	private setRefreshTokenCookie(res: Response, refreshToken: string) {
		const isProduction = process.env.NODE_ENV === 'production';

		res.cookie('refresh_token', refreshToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
		});
	}

	private clearRefreshTokenCookie(res: Response) {
		res.clearCookie('refresh_token');
	}
}
