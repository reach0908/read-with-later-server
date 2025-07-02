import { Injectable } from '@nestjs/common';
import { ScrapingStrategy } from '../interfaces/scraping-strategy.interface';

@Injectable()
export class ScrapingStrategyFactory {
	constructor(private readonly strategies: ScrapingStrategy[]) {}

	getStrategies(): ScrapingStrategy[] {
		return this.strategies
			.filter((strategy) => strategy.canHandle())
			.sort((a, b) => a.getPriority() - b.getPriority());
	}

	getStrategyByName(name: string): ScrapingStrategy | undefined {
		return this.strategies.find((strategy) => strategy.getStrategyName() === name);
	}
}
