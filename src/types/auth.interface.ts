export interface JwtPayload {
	sub: string;
	email: string;
	name?: string | null;
	type: 'access' | 'refresh';
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
