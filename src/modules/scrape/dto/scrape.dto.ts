import { IsString, IsUrl } from 'class-validator';

export class ScrapeDto {
	@IsString()
	@IsUrl({ require_tld: false })
	url: string;
}
