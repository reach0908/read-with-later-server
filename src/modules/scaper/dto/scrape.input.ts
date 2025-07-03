import { IsString, IsUrl } from 'class-validator';

export class ScrapeInput {
	@IsString()
	@IsUrl()
	url: string;
}
