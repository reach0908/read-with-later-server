import { ApiProperty } from '@nestjs/swagger';
import { ArticleOutput } from './article.output';

/**
 * 페이지네이션된 Article 목록 출력 DTO
 */
export class PaginatedArticlesOutput {
	@ApiProperty({
		description: 'Article 목록',
		type: [ArticleOutput],
	})
	articles!: ArticleOutput[];

	@ApiProperty({
		description: '총 항목 수',
		example: 150,
	})
	total!: number;

	@ApiProperty({
		description: '현재 페이지',
		example: 1,
	})
	page!: number;

	@ApiProperty({
		description: '페이지당 항목 수',
		example: 20,
	})
	limit!: number;

	@ApiProperty({
		description: '총 페이지 수',
		example: 8,
	})
	totalPages!: number;

	@ApiProperty({
		description: '다음 페이지 존재 여부',
		example: true,
	})
	hasNext!: boolean;

	@ApiProperty({
		description: '이전 페이지 존재 여부',
		example: false,
	})
	hasPrev!: boolean;
}
