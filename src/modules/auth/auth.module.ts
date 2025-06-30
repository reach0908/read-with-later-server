import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { DatabaseModule } from 'src/database/database.module';
import { TokenService } from './services/token.service';
import { OAuthService } from './services/oauth.service';

@Global()
@Module({
	imports: [
		PassportModule,
		UserModule,
		DatabaseModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>('JWT_SECRET'),
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, TokenService, OAuthService, GoogleStrategy, JwtAuthGuard],
	exports: [AuthService, TokenService, OAuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
