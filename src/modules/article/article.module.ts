import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ArticleController } from 'src/modules/article/article.controller';
import { ArticleRepository } from 'src/modules/article/article.repository';
import { ArticleService } from 'src/modules/article/article.service';

@Module({
	imports: [DatabaseModule],
	controllers: [ArticleController],
	providers: [ArticleRepository, ArticleService],
	exports: [ArticleService],
})
export class ArticleModule {}
