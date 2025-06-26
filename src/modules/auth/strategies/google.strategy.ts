import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import authConfig from 'src/config/auth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(
		@Inject(authConfig.KEY)
		private readonly config: ConfigType<typeof authConfig>,
	) {
		super({
			clientID: config.GOOGLE_CLIENT_ID,
			clientSecret: config.GOOGLE_CLIENT_SECRET,
			callbackURL: 'http://localhost:3000/auth/google/callback',
			scope: ['email', 'profile'],
		});
	}

	validate(accessToken: string, refreshToken: string, profile: Profile) {
		const { id, emails, displayName } = profile;

		if (!emails?.[0]?.value) {
			throw new UnauthorizedException('Email not found');
		}

		return {
			provider: 'google',
			providerId: id,
			email: emails[0].value,
			name: displayName,
			accessToken,
		};
	}
}
