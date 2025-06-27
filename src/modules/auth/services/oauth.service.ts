import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { UserService } from 'src/modules/user/user.service';
import { GoogleProfile } from 'src/types';
import { PROVIDER } from '../constants/strategy.constant';

@Injectable()
export class OAuthService {
	constructor(private readonly userService: UserService) {}

	async handleGoogleLogin(profile: GoogleProfile): Promise<User> {
		if (!profile || !Array.isArray(profile.emails) || !profile.emails[0]?.value) {
			throw new BadRequestException('Google profile does not contain email');
		}

		const email = profile.emails[0].value;
		const name = typeof profile.displayName === 'string' ? profile.displayName : null;

		let user = await this.userService.findByEmail(email);

		if (!user) {
			user = await this.userService.createUser({
				email,
				name,
				provider: PROVIDER.GOOGLE,
				providerId: profile.id,
			});
		}
		return user;
	}
}
