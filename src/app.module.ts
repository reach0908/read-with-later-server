import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { DatabaseModule } from 'src/database/database.module';
import databaseConfig from 'src/config/database.config';
import authConfig from 'src/config/auth.config';
import appConfig from 'src/config/app.config';
import crawlerConfig from 'src/config/crawler.config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ScrapeModule } from 'src/modules/scrape/scrape.module';
import { CrawlerModule } from 'src/modules/crawler/crawler.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: `.env.${process.env.NODE_ENV ?? 'local'}`,
			load: [databaseConfig, authConfig, appConfig, crawlerConfig],
		}),
		DatabaseModule,
		AuthModule,
		CrawlerModule,
		ScrapeModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
