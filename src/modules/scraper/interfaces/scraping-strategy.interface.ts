export interface ScrapedContent {
	title: string;
	content: string;
	htmlContent: string;
	author: string | null;
	excerpt: string;
}

export interface ScrapingStrategy {
	scrape(url: string): Promise<ScrapedContent>;
	canHandle(): boolean;
	getPriority(): number;
	getStrategyName(): string;
}
