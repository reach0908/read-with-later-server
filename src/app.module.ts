import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Configs
import databaseConfig from 'src/config/database.config';
import authConfig from 'src/config/auth.config';
import appConfig from 'src/config/app.config';
import throttlerConfig from 'src/config/throttler.config';

// Common Modules
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from 'src/database/database.module';

// Modules
import { AuthModule } from 'src/modules/auth/auth.module';
import { ScraperModule } from './modules/scaper/scraper.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: `.env.${process.env.NODE_ENV ?? 'local'}`,
			load: [databaseConfig, authConfig, appConfig, throttlerConfig],
		}),
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => [
				{
					ttl: configService.get<number>('throttler.TTL', 60),
					limit: configService.get<number>('throttler.LIMIT', 10),
				},
			],
		}),
		BullModule.forRoot({
			connection: {
				host: process.env.REDIS_HOST,
				port: Number(process.env.REDIS_PORT),
				username: process.env.REDIS_USERNAME,
				password: process.env.REDIS_PASSWORD,
			},
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 3000,
				},
			},
		}),
		// Infra
		DatabaseModule,
		// Modules
		AuthModule,
		ScraperModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
	],
})
export class AppModule {}
