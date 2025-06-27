import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { OAuthService } from '../services/oauth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(
		private configService: ConfigService,
		private oauthService: OAuthService,
	) {
		super({
			clientID: configService.get<string>('auth.GOOGLE_CLIENT_ID') || '',
			clientSecret: configService.get<string>('auth.GOOGLE_CLIENT_SECRET') || '',
			callbackURL: configService.get<string>('auth.GOOGLE_CALLBACK_URL') || '',
			scope: ['email', 'profile'],
		});
	}

	async validate(accessToken: string, refreshToken: string, profile: any) {
		const user = await this.oauthService.handleGoogleLogin(profile);
		return user;
	}
}
