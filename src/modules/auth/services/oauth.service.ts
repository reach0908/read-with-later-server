import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { UserService } from 'src/modules/user/user.service';
import { GoogleProfile } from 'src/types';

@Injectable()
export class OAuthService {
	constructor(private readonly userService: UserService) {}

	async handleGoogleLogin(profile: GoogleProfile): Promise<User | null> {
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
				provider: 'google',
				providerId: profile.id,
			});
		}
		return user;
	}
}
