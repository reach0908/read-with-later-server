import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigType } from '@nestjs/config';

import authConfigType from 'src/config/auth.config';

import { PROVIDER } from 'src/modules/auth/constants/strategy.constant';
import { OAuthService } from 'src/modules/auth/services/oauth.service';
import { GoogleProfile } from 'src/types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, PROVIDER.GOOGLE) {
	constructor(
		@Inject(authConfigType.KEY)
		private readonly configService: ConfigType<typeof authConfigType>,
		private oauthService: OAuthService,
	) {
		super({
			clientID: configService.GOOGLE_CLIENT_ID!,
			clientSecret: configService.GOOGLE_CLIENT_SECRET!,
			callbackURL: configService.GOOGLE_CALLBACK_URL,
			scope: ['email', 'profile'],
		});
	}

	async validate(accessToken: string, refreshToken: string, profile: GoogleProfile) {
		const user = await this.oauthService.handleGoogleLogin(profile);
		return user;
	}
}
