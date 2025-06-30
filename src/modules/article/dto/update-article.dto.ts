import { IsOptional, IsString } from 'class-validator';

export class UpdateArticleDto {
	@IsOptional()
	@IsString()
	title?: string;

	@IsOptional()
	@IsString()
	content?: string;

	@IsOptional()
	@IsString()
	excerpt?: string;
}
