import { IsOptional, IsString, IsInt, IsBoolean, IsArray, IsIn, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Article 목록 조회를 위한 입력 DTO
 */
export class ListArticlesInput {
	@ApiPropertyOptional({
		description: '페이지 번호 (1부터 시작)',
		example: 1,
		default: 1,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({
		description: '페이지당 항목 수',
		example: 20,
		default: 20,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 20;

	@ApiPropertyOptional({
		description: '검색 키워드 (제목, 내용에서 검색)',
		example: 'javascript',
	})
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({
		description: '태그 필터',
		example: ['tech', 'programming'],
		type: [String],
	})
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	tags?: string[];

	@ApiPropertyOptional({
		description: '북마크된 항목만 조회',
		example: true,
	})
	@IsOptional()
	@IsBoolean()
	isBookmarked?: boolean;

	@ApiPropertyOptional({
		description: '아카이브된 항목만 조회',
		example: false,
	})
	@IsOptional()
	@IsBoolean()
	isArchived?: boolean;

	@ApiPropertyOptional({
		description: '정렬 기준',
		example: 'createdAt',
		enum: ['createdAt', 'updatedAt', 'title', 'publishedAt'],
	})
	@IsOptional()
	@IsString()
	@IsIn(['createdAt', 'updatedAt', 'title', 'publishedAt'])
	sortBy?: string = 'createdAt';

	@ApiPropertyOptional({
		description: '정렬 순서',
		example: 'desc',
		enum: ['asc', 'desc'],
	})
	@IsOptional()
	@IsString()
	@IsIn(['asc', 'desc'])
	sortOrder?: string = 'desc';
}
