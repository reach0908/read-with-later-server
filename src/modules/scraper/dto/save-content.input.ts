import { IsArray, IsBoolean, IsOptional, IsString, ArrayNotEmpty, ArrayUnique } from 'class-validator';
import { FetchContentInput } from './fetch-content.input';

/**
 * 웹 콘텐츠를 스크래핑하고 저장하기 위한 DTO
 * FetchContentInput을 확장하여 태그, 북마크, 아카이브 옵션을 추가합니다.
 */
export class SaveContentInput extends FetchContentInput {
	/**
	 * 태그 목록 (선택)
	 */
	@IsOptional()
	@IsArray()
	@ArrayNotEmpty()
	@ArrayUnique()
	@IsString({ each: true })
	tags?: string[];

	/**
	 * 북마크 여부 (선택)
	 */
	@IsOptional()
	@IsBoolean()
	isBookmarked?: boolean;

	/**
	 * 아카이브 여부 (선택)
	 */
	@IsOptional()
	@IsBoolean()
	isArchived?: boolean;
}
