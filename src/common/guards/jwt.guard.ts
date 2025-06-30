import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { TokenService } from 'src/modules/auth/services/token.service';
import { JwtPayload, TokenType } from 'src/types';

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

		// Authorization 헤더에서 Access Token 추출
		const authHeader = request.headers['authorization'];
		const accessToken =
			authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
				? authHeader.split(' ')[1]
				: null;

		// (선택) Refresh Token을 헤더에서 추출하려면 아래 코드 사용
		// const refreshToken = request.headers['x-refresh-token'] as string | undefined;

		if (!accessToken) {
			throw new UnauthorizedException('No access token provided');
		}

		try {
			// Access Token 검증
			const payload = this.jwtService.verify<JwtPayload>(accessToken);

			if (payload.type !== TokenType.ACCESS) {
				throw new UnauthorizedException('Invalid token type');
			}

			// 사용자 정보를 request에 추가
			const user = await this.authService.validateUser(payload.email);
			request.user = user;

			return true;
		} catch {
			// (선택) Refresh Token 로직을 사용하려면 아래 코드 활성화
			// if (refreshToken) {
			// 	try {
			// 		const { accessToken: newAccessToken } = await this.tokenService.refreshTokens(refreshToken);
			// 		const payload = this.jwtService.verify<JwtPayload>(newAccessToken);
			// 		const user = await this.authService.validateUser(payload.email);
			// 		request.user = user;
			// 		return true;
			// 	} catch {
			// 		throw new UnauthorizedException('Invalid refresh token');
			// 	}
			// }

			throw new UnauthorizedException('Invalid access token');
		}
	}
}
