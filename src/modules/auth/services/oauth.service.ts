import { Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { UserService } from 'src/modules/user/user.service';
import { GoogleProfile } from 'src/types';

@Injectable()
export class OAuthService {
	private readonly logger = new Logger(OAuthService.name);

	constructor(private readonly userService: UserService) {}

	async handleGoogleLogin(profile: GoogleProfile): Promise<User | null> {
		if (!profile || !Array.isArray(profile.emails) || !profile.emails[0]?.value) {
			this.logger.warn('Google profile does not contain email');
			throw new Error('Google profile does not contain email');
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
			this.logger.debug(`신규 Google 사용자 생성: ${email}`);
		} else {
			this.logger.debug(`기존 Google 사용자 로그인: ${email}`);
		}
		return user;
	}
}
