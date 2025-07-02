import { Injectable } from '@nestjs/common';
import * as TurndownService from 'turndown';
import { HtmlConverter } from '../interfaces/html-converter.interface';
import { SCRAPER_CONSTANTS } from '../constants/scraper.constants';

@Injectable()
export class TurndownHtmlConverter implements HtmlConverter {
	private readonly turndownService: any;

	constructor() {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		this.turndownService = new (TurndownService as any)({
			headingStyle: SCRAPER_CONSTANTS.TURNDOWN.HEADING_STYLE,
			codeBlockStyle: SCRAPER_CONSTANTS.TURNDOWN.CODE_BLOCK_STYLE,
		});

		this.setupCustomRules();
	}

	convert(html: string): string {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
		return this.turndownService.turndown(html);
	}

	private setupCustomRules(): void {
		const calloutRule = {
			filter: (node: HTMLElement) => {
				return (
					node.nodeName === 'DIV' &&
					typeof node.getAttribute === 'function' &&
					node.getAttribute('class')?.includes('callout')
				);
			},
			replacement: (content: string) => {
				return `> ${content.replace(/\n/g, '\n> ')}\n\n`;
			},
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.addRule('callout', calloutRule);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		this.turndownService.keep(SCRAPER_CONSTANTS.TURNDOWN.PRESERVED_ELEMENTS);
	}
}
