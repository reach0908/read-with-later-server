import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { UserService } from 'src/modules/user/user.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { AuthRequest } from 'src/types';
import { CreateUserInput } from 'src/modules/user/dto/create-user.input';

@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post()
	async createUser(@Body() createUserInput: CreateUserInput) {
		return this.userService.createUser(createUserInput);
	}

	@Get()
	@UseGuards(JwtAuthGuard)
	async getUser(@Req() req: AuthRequest) {
		return this.userService.getUserById(req.user.id);
	}
}
