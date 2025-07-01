import { Module } from '@nestjs/common';

// Configs
import databaseConfig from 'src/config/database.config';
import authConfig from 'src/config/auth.config';
import appConfig from 'src/config/app.config';

// Modules
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: `.env.${process.env.NODE_ENV ?? 'local'}`,
			load: [databaseConfig, authConfig, appConfig],
		}),
		DatabaseModule,
		// Modules
		AuthModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
