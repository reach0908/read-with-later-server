import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { JwtPayload, TokenType } from 'src/types';

interface AuthenticatedRequest extends Request {
	user?: any;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
	private readonly logger = new Logger(JwtAuthGuard.name);

	constructor(
		private readonly jwtService: JwtService,
		private readonly authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

		const authHeader = request.headers['authorization'];

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new UnauthorizedException('Bearer token required');
		}

		const accessToken = authHeader.split(' ')[1];

		if (!accessToken) {
			throw new UnauthorizedException('No access token provided');
		}

		try {
			const payload = this.jwtService.verify<JwtPayload>(accessToken);

			if (payload.type !== TokenType.ACCESS) {
				throw new UnauthorizedException('Invalid token type');
			}

			const user = await this.authService.validateUser(payload.email);
			if (!user) {
				throw new UnauthorizedException('Invalid access token');
			}

			request.user = user;
			return true;
		} catch (err) {
			if (err instanceof UnauthorizedException) {
				throw err;
			}
			this.logger.error(`JWT verification failed: ${(err as Error).message}`);
			throw new UnauthorizedException('Invalid access token');
		}
	}
}
