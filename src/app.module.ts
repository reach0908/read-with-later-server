import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Configs
import databaseConfig from 'src/config/database.config';
import authConfig from 'src/config/auth.config';
import appConfig from 'src/config/app.config';
import throttlerConfig from 'src/config/throttler.config';

// Modules
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { ArticleModule } from './modules/article/article.module';

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
		// Infra
		DatabaseModule,
		// Modules
		AuthModule,
		ArticleModule,
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
