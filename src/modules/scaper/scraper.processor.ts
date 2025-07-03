import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ScraperService } from './scraper.service';

@Processor('scraper')
export class ScraperProcessor extends WorkerHost {
	constructor(private readonly scraperService: ScraperService) {
		super();
	}

	process(job: Job): Promise<any> {
		return this.scraperService.scrape(job.data.url as string);
	}

	@OnWorkerEvent('active')
	onActive(job: Job) {
		console.log(`Processing job ${job.id} of type ${job.name}`);
	}

	@OnWorkerEvent('completed')
	onCompleted(job: Job, result: any) {
		console.log(`Job ${job.id} completed with result ${result}`);
	}

	@OnWorkerEvent('failed')
	onFailed(job: Job, error: Error) {
		console.log(`Job ${job.id} failed with error ${error}`);
	}
}
