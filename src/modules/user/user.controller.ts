import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';

import { UserService } from 'src/modules/user/user.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { AuthRequest } from 'src/types';
import { UpdateUserInput } from 'src/modules/user/dto/update-user.input';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@ApiOperation({ summary: 'Get user', description: 'Get user by JWT token' })
	@ApiResponse({ status: 200, description: 'User found' })
	@Get()
	@UseGuards(JwtAuthGuard)
	async getUser(@Req() req: AuthRequest) {
		return this.userService.getUserById(req.user.id);
	}

	@ApiOperation({ summary: 'Update user', description: 'Update user by JWT token' })
	@ApiBody({ type: UpdateUserInput })
	@ApiResponse({ status: 200, description: 'User updated' })
	@Patch()
	@UseGuards(JwtAuthGuard)
	async updateUser(@Req() req: AuthRequest, @Body() updateUserInput: UpdateUserInput) {
		return await this.userService.updateUser(req.user.id, updateUserInput);
	}
}
