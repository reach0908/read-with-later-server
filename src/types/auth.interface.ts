import { User } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
	sub: string;
	email: string;
	name?: string | null;
	type: TokenType;
	// JWT 표준 필드
	readonly iat?: number;
	readonly exp?: number;
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

export enum TokenType {
	ACCESS = 'access',
	REFRESH = 'refresh',
}

export interface AuthRequest extends Request {
	user?: User;
	cookies: {
		access_token?: string;
		refresh_token?: string;
	};
}
