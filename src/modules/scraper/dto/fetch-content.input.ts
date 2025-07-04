import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * DTO used by ScraperController (or other callers) to request content scraping.
 */
export class FetchContentInput {
	@IsString()
	@IsNotEmpty()
	@IsUrl({ require_protocol: true })
	url!: string;

	@IsOptional()
	@IsString()
	locale?: string;

	@IsOptional()
	@IsString()
	timezone?: string;
}
