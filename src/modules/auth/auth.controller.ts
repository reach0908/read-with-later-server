import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Get('google')
	@UseGuards(AuthGuard('google'))
	googleLogin() {}

	@Get('google/callback')
	@UseGuards(AuthGuard('google'))
	googleCallback(@Req() req: Request) {}
}
