import { Module } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/auth.service';
import { UserModule } from 'src/modules/user/user.module';
import { GoogleStrategy } from 'src/modules/auth/strategies/google.strategy';

@Module({
	imports: [UserModule],
	controllers: [],
	providers: [AuthService, GoogleStrategy],
	exports: [AuthService],
})
export class AuthModule {}
