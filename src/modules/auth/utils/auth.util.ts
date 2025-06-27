import { Response } from 'express';

export function setAccessTokenCookie(res: Response, accessToken: string) {
	const isProduction = process.env.NODE_ENV === 'production';

	res.cookie('access_token', accessToken, {
		httpOnly: true,
		secure: isProduction,
		sameSite: 'lax',
		maxAge: 15 * 60 * 1000,
	});
}

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
	const isProduction = process.env.NODE_ENV === 'production';

	res.cookie('refresh_token', refreshToken, {
		httpOnly: true,
		secure: isProduction,
		sameSite: 'lax',
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
}

export function clearAllTokenCookies(res: Response) {
	res.clearCookie('access_token');
	res.clearCookie('refresh_token');
}
