import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class AuthService {
	constructor(private readonly userService: UserService) {}

	async validateUser(email: User['email']) {
		const user = await this.userService.findByEmail(email);
		if (!user) {
			throw new NotFoundException('Can not found user');
		}
		return user;
	}
}
