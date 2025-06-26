import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(
		private configService: ConfigService,
		private authService: AuthService,
	) {
		super({
			clientID: configService.get<string>('auth.GOOGLE_CLIENT_ID') || '',
			clientSecret: configService.get<string>('auth.GOOGLE_CLIENT_SECRET') || '',
			callbackURL: configService.get<string>('auth.GOOGLE_CALLBACK_URL') || '',
			scope: ['email', 'profile'],
		});
	}

	async validate(accessToken: string, refreshToken: string, profile: any) {
		const user = await this.authService.handleGoogleLogin(profile);
		return user;
	}
}
