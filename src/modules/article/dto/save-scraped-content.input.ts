import { IsNotEmpty, IsOptional, IsString, IsUrl, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 스크래핑된 콘텐츠를 저장하기 위한 입력 DTO
 */
export class SaveScrapedContentInput {
	@ApiProperty({
		description: '스크래핑할 URL',
		example: 'https://example.com/article',
	})
	@IsString()
	@IsNotEmpty()
	@IsUrl({ require_protocol: true })
	url!: string;

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
