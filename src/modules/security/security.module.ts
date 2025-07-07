import { Module } from '@nestjs/common';
import { SecurityService } from './services/security.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
	imports: [ConfigModule, HttpModule],
	providers: [SecurityService],
	exports: [SecurityService],
})
export class SecurityModule {}
