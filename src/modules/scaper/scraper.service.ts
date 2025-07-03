import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class ScraperService {
	constructor(@InjectQueue('scraper') private readonly scraperQueue: Queue) {}

	async queueScrape(url: string) {
		await this.scraperQueue.add('scrape', { url });
	}

	async scrape(url: string) {}
}
