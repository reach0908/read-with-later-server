import { IsNotEmpty, IsOptional, IsString, IsUrl, IsArray, IsBoolean, IsInt, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Article 생성을 위한 입력 DTO
 */
export class CreateArticleInput {
	@ApiProperty({
		description: '원본 URL',
		example: 'https://example.com/article',
	})
	@IsString()
	@IsNotEmpty()
	@IsUrl({ require_protocol: true })
	url!: string;

	@ApiProperty({
		description: '최종 URL (리디렉션 후)',
		example: 'https://example.com/article',
	})
	@IsString()
	@IsNotEmpty()
	@IsUrl({ require_protocol: true })
	finalUrl!: string;

	@ApiPropertyOptional({
		description: '추출된 제목',
		example: 'Amazing Article Title',
	})
	@IsOptional()
	@IsString()
	title?: string;

	@ApiPropertyOptional({
		description: '스크래핑된 콘텐츠 (HTML)',
		example: '<div>Article content...</div>',
	})
	@IsOptional()
	@IsString()
	content?: string;

	@ApiPropertyOptional({
		description: 'MIME 타입',
		example: 'text/html',
	})
	@IsOptional()
	@IsString()
	contentType?: string;

	@ApiPropertyOptional({
		description: '요약',
		example: 'This article discusses...',
	})
	@IsOptional()
	@IsString()
	summary?: string;

	@ApiPropertyOptional({
		description: '저자',
		example: 'John Doe',
	})
	@IsOptional()
	@IsString()
	author?: string;

	@ApiPropertyOptional({
		description: '발행일',
		example: '2024-01-01T00:00:00Z',
	})
	@IsOptional()
	@IsDateString()
	publishedAt?: string;

	@ApiPropertyOptional({
		description: '단어 수',
		example: 1500,
	})
	@IsOptional()
	@IsInt()
	@Min(0)
	wordCount?: number;

	@ApiPropertyOptional({
		description: '예상 읽기 시간 (분)',
		example: 7,
	})
	@IsOptional()
	@IsInt()
	@Min(0)
	readingTime?: number;

	@ApiPropertyOptional({
		description: '태그 배열',
		example: ['tech', 'ai', 'programming'],
		type: [String],
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[];

	@ApiPropertyOptional({
		description: '북마크 여부',
		example: false,
		default: false,
	})
	@IsOptional()
	@IsBoolean()
	isBookmarked?: boolean;

	@ApiPropertyOptional({
		description: '아카이브 여부',
		example: false,
		default: false,
	})
	@IsOptional()
	@IsBoolean()
	isArchived?: boolean;
}
