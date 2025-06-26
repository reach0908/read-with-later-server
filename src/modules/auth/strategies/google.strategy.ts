import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { User } from '@prisma/client';
import authConfigType from 'src/config/auth.config';
import appConfigType from 'src/config/app.config';
import { AuthService } from 'src/modules/auth/auth.service';
import { PROVIDER } from 'src/modules/auth/constants/strategy.constant';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(
		@Inject(authConfigType.KEY)
		private readonly authConfig: ConfigType<typeof authConfigType>,
		@Inject(appConfigType.KEY)
		private readonly appConfig: ConfigType<typeof appConfigType>,
		private readonly userService: UserService,
		private readonly authService: AuthService,
	) {
		super({
			clientID: authConfig.GOOGLE_CLIENT_ID,
			clientSecret: authConfig.GOOGLE_CLIENT_SECRET,
			callbackURL: `${appConfig.HOST}:${appConfig.PORT}/${authConfig.GOOGLE_CALLBACK_URL}`,
			scope: ['email', 'profile'],
		});
	}

	async validate(accessToken: string, refreshToken: string, profile: Profile) {
		const { id, emails, displayName } = profile;

		if (!emails?.[0]?.value) {
			throw new UnauthorizedException('Email not found');
		}

		let user: User | null = null;

		try {
			user = await this.authService.validateUser(emails[0].value);
		} catch (error) {
			if (error instanceof NotFoundException) {
				user = await this.userService.createUser({
					email: emails[0].value,
					name: displayName,
					provider: PROVIDER.GOOGLE,
					providerId: id,
				});
			} else {
				throw new UnauthorizedException('Invalid credentials');
			}
		}

		return user;
	}
}
