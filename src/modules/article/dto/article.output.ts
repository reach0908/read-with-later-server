import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Article 출력 DTO
 */
export class ArticleOutput {
	@ApiProperty({
		description: 'Article ID',
		example: 'uuid-string',
	})
	id!: string;

	@ApiProperty({
		description: '원본 URL',
		example: 'https://example.com/article',
	})
	url!: string;

	@ApiProperty({
		description: '최종 URL (리디렉션 후)',
		example: 'https://example.com/article',
	})
	finalUrl!: string;

	@ApiPropertyOptional({
		description: '추출된 제목',
		example: 'Amazing Article Title',
	})
	title?: string;

	@ApiPropertyOptional({
		description: '스크래핑된 콘텐츠 (HTML)',
		example: '<div>Article content...</div>',
	})
	content?: string;

	@ApiPropertyOptional({
		description: 'MIME 타입',
		example: 'text/html',
	})
	contentType?: string;

	@ApiPropertyOptional({
		description: '요약',
		example: 'This article discusses...',
	})
	summary?: string;

	@ApiPropertyOptional({
		description: '저자',
		example: 'John Doe',
	})
	author?: string;

	@ApiPropertyOptional({
		description: '발행일',
		example: '2024-01-01T00:00:00Z',
	})
	publishedAt?: Date;

	@ApiPropertyOptional({
		description: '단어 수',
		example: 1500,
	})
	wordCount?: number;

	@ApiPropertyOptional({
		description: '예상 읽기 시간 (분)',
		example: 7,
	})
	readingTime?: number;

	@ApiPropertyOptional({
		description: '태그 배열',
		example: ['tech', 'ai', 'programming'],
		type: [String],
	})
	tags?: string[];

	@ApiProperty({
		description: '북마크 여부',
		example: false,
	})
	isBookmarked!: boolean;

	@ApiProperty({
		description: '아카이브 여부',
		example: false,
	})
	isArchived!: boolean;

	@ApiProperty({
		description: '사용자 ID',
		example: 'user-uuid',
	})
	userId!: string;

	@ApiProperty({
		description: '생성일',
		example: '2024-01-01T00:00:00Z',
	})
	createdAt!: Date;

	@ApiProperty({
		description: '업데이트일',
		example: '2024-01-01T00:00:00Z',
	})
	updatedAt!: Date;
}
