import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { JwtPayload, TokenType } from 'src/types';

interface AuthenticatedRequest extends Request {
	user?: any;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		private readonly authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

		// Authorization 헤더에서 Bearer 토큰 추출
		const authHeader = request.headers['authorization'];

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException('No access token provided');
		}
		const accessToken = authHeader.split(' ')[1];

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
			throw new UnauthorizedException('Invalid access token');
		}
	}
}
