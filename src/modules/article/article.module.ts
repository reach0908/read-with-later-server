import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ArticleController } from './article.controller';
import { ArticleService } from './services/article.service';
import { ArticleRepository } from './repositories/article.repository';

/**
 * Article 모듈
 * 스크래핑된 콘텐츠 저장 및 관리 기능을 제공합니다.
 */
@Module({
	imports: [DatabaseModule],
	controllers: [ArticleController],
	providers: [ArticleService, ArticleRepository],
	exports: [ArticleService],
})
export class ArticleModule {}
