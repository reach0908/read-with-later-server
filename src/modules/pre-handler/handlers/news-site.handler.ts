import { Injectable, Logger } from '@nestjs/common';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * News site transformations.
 * Each news site has specific URL patterns and optimal access methods.
 */
const NEWS_SITE_TRANSFORMATIONS: Record<string, (url: URL) => URL> = {
	'nytimes.com': (url) => {
		// New York Times: Use print version to bypass paywall
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'wsj.com': (url) => {
		// Wall Street Journal: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'washingtonpost.com': (url) => {
		// Washington Post: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'ft.com': (url) => {
		// Financial Times: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'bloomberg.com': (url) => {
		// Bloomberg: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'economist.com': (url) => {
		// The Economist: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'cnn.com': (url) => {
		// CNN: Use mobile version for cleaner layout
		const newUrl = new URL(url.href);
		newUrl.hostname = 'lite.cnn.com';
		return newUrl;
	},
	'bbc.com': (url) => {
		// BBC: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.bbc.com';
		return newUrl;
	},
	'bbc.co.uk': (url) => {
		// BBC UK: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.bbc.co.uk';
		return newUrl;
	},
	'reuters.com': (url) => {
		// Reuters: Keep original, usually accessible
		return url;
	},
	'apnews.com': (url) => {
		// Associated Press: Keep original, usually accessible
		return url;
	},
	'theguardian.com': (url) => {
		// The Guardian: Keep original, no paywall
		return url;
	},
	'npr.org': (url) => {
		// NPR: Keep original, usually accessible
		return url;
	},
	'politico.com': (url) => {
		// Politico: Use print version for better readability
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'axios.com': (url) => {
		// Axios: Keep original, usually accessible
		return url;
	},
	'vox.com': (url) => {
		// Vox: Keep original, usually accessible
		return url;
	},
	'buzzfeed.com': (url) => {
		// BuzzFeed: Keep original
		return url;
	},
	'huffpost.com': (url) => {
		// HuffPost: Keep original
		return url;
	},
	'usatoday.com': (url) => {
		// USA Today: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'latimes.com': (url) => {
		// LA Times: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'chicagotribune.com': (url) => {
		// Chicago Tribune: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'time.com': (url) => {
		// Time Magazine: Keep original
		return url;
	},
	'newsweek.com': (url) => {
		// Newsweek: Keep original
		return url;
	},
	'theatlantic.com': (url) => {
		// The Atlantic: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'newyorker.com': (url) => {
		// The New Yorker: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'forbes.com': (url) => {
		// Forbes: Keep original but remove tracking
		const newUrl = new URL(url.href);
		newUrl.searchParams.delete('sh');
		return newUrl;
	},
	'techcrunch.com': (url) => {
		// TechCrunch: Keep original
		return url;
	},
	'engadget.com': (url) => {
		// Engadget: Keep original
		return url;
	},
	'theverge.com': (url) => {
		// The Verge: Keep original
		return url;
	},
	'wired.com': (url) => {
		// Wired: Use print version
		const newUrl = new URL(url.href);
		newUrl.searchParams.set('print', '1');
		return newUrl;
	},
	'arstechnica.com': (url) => {
		// Ars Technica: Keep original, usually accessible
		return url;
	},
	'espn.com': (url) => {
		// ESPN: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.espn.com';
		return newUrl;
	},
	'cbssports.com': (url) => {
		// CBS Sports: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.cbssports.com';
		return newUrl;
	},
	'nfl.com': (url) => {
		// NFL: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.nfl.com';
		return newUrl;
	},
	'nba.com': (url) => {
		// NBA: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.nba.com';
		return newUrl;
	},
};

/**
 * A content handler specifically for news websites.
 * This handler detects news site URLs and transforms them to more
 * accessible versions, often bypassing paywalls or using cleaner layouts.
 */
@Injectable()
export class NewsSiteHandler implements IContentHandler {
	private readonly logger = new Logger(NewsSiteHandler.name);

	/**
	 * Checks if the URL is from a supported news website.
	 * @param url - The URL to check.
	 * @returns `true` if the URL is from a supported news website.
	 */
	public canHandle(url: URL): boolean {
		return Object.keys(NEWS_SITE_TRANSFORMATIONS).some((domain) => url.hostname.endsWith(domain));
	}

	/**
	 * Processes news site URLs by transforming them to more accessible versions.
	 * @param url - The news site URL to handle.
	 * @returns A `PreHandleResult` with the transformed URL, or `null` on failure.
	 */
	public handle(url: URL): Promise<PreHandleResult | null> {
		const domain = Object.keys(NEWS_SITE_TRANSFORMATIONS).find((d) => url.hostname.endsWith(d));

		if (!domain) {
			return Promise.resolve(null);
		}

		try {
			const transform = NEWS_SITE_TRANSFORMATIONS[domain];
			const newUrl = transform(url);

			this.logger.debug(`Transformed news site URL [${domain}]: ${url.href} -> ${newUrl.href}`);

			// Extract potential title from URL
			let title: string | undefined;
			const siteName = this.getSiteName(domain);

			// Try to extract article title from URL path
			const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
			if (pathParts.length > 0) {
				// Look for article identifiers in the path
				const lastPart = pathParts[pathParts.length - 1];
				if (lastPart.includes('-') || lastPart.includes('_')) {
					// Convert URL slug to title
					title = lastPart
						.replace(/[-_]/g, ' ')
						.replace(/\.(html|htm|php|asp|aspx)$/i, '')
						.replace(/\b\w/g, (l) => l.toUpperCase())
						.trim();

					if (title.length > 60) {
						title = title.substring(0, 60) + '...';
					}

					title = `${siteName}: ${title}`;
				}
			}

			// Fallback title
			if (!title) {
				title = `${siteName} Article`;
			}

			return Promise.resolve({
				url: newUrl.href,
				title,
				contentType: 'text/html',
			});
		} catch (error) {
			this.logger.warn(`NewsSiteHandler failed for ${url.href}: ${(error as Error).message}`);
			return Promise.resolve(null);
		}
	}

	/**
	 * Gets a human-readable site name from domain.
	 * @param domain - The domain name.
	 * @returns The site name.
	 */
	private getSiteName(domain: string): string {
		const siteNames: Record<string, string> = {
			'nytimes.com': 'New York Times',
			'wsj.com': 'Wall Street Journal',
			'washingtonpost.com': 'Washington Post',
			'ft.com': 'Financial Times',
			'bloomberg.com': 'Bloomberg',
			'economist.com': 'The Economist',
			'cnn.com': 'CNN',
			'bbc.com': 'BBC',
			'bbc.co.uk': 'BBC',
			'reuters.com': 'Reuters',
			'apnews.com': 'Associated Press',
			'theguardian.com': 'The Guardian',
			'npr.org': 'NPR',
			'politico.com': 'Politico',
			'axios.com': 'Axios',
			'vox.com': 'Vox',
			'buzzfeed.com': 'BuzzFeed',
			'huffpost.com': 'HuffPost',
			'usatoday.com': 'USA Today',
			'latimes.com': 'LA Times',
			'chicagotribune.com': 'Chicago Tribune',
			'time.com': 'Time',
			'newsweek.com': 'Newsweek',
			'theatlantic.com': 'The Atlantic',
			'newyorker.com': 'The New Yorker',
			'forbes.com': 'Forbes',
			'techcrunch.com': 'TechCrunch',
			'engadget.com': 'Engadget',
			'theverge.com': 'The Verge',
			'wired.com': 'Wired',
			'arstechnica.com': 'Ars Technica',
			'espn.com': 'ESPN',
			'cbssports.com': 'CBS Sports',
			'nfl.com': 'NFL',
			'nba.com': 'NBA',
		};

		return siteNames[domain] || domain;
	}
}
