import { IsUrl } from 'class-validator';

export class ScrapeUrlDto {
	@IsUrl({}, { message: 'Provided URL is not valid.' })
	url: string;
}
