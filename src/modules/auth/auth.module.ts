import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { DatabaseModule } from 'src/database/database.module';

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
	providers: [AuthService, GoogleStrategy, JwtAuthGuard],
	exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
