import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';

import { UserService } from 'src/modules/user/user.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { AuthRequest } from 'src/types';
import { UpdateUserInput } from 'src/modules/user/dto/update-user.input';

@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Get()
	@UseGuards(JwtAuthGuard)
	async getUser(@Req() req: AuthRequest) {
		return this.userService.getUserById(req.user.id);
	}

	@Patch()
	@UseGuards(JwtAuthGuard)
	async updateUser(@Req() req: AuthRequest, @Body() updateUserInput: UpdateUserInput) {
		return await this.userService.updateUser(req.user.id, updateUserInput);
	}
}
