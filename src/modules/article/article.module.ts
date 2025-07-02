import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ArticleRepository } from 'src/modules/article/article.repository';
import { ArticleService } from 'src/modules/article/article.service';

@Module({
	imports: [DatabaseModule],
	providers: [ArticleRepository, ArticleService],
	exports: [ArticleService],
})
export class ArticleModule {}
