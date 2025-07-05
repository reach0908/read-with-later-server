import { Injectable, Logger } from '@nestjs/common';
import { IContentHandler } from '../interfaces/content-handler.interface';
import { PreHandleResult } from '../dto/pre-handle-result.dto';

/**
 * A map of domain names to their URL transformation functions.
 * This allows for easy extension to support new domains.
 * Note: Social media domains are handled by SocialMediaHandler,
 * and news sites are handled by NewsSiteHandler.
 */
const DOMAIN_TRANSFORMATIONS: Record<string, (url: URL) => URL> = {
	// Publishing platforms
	'substack.com': (url) => {
		// Substack provides a clean AMP version by setting the search query.
		const newUrl = new URL(url.href);
		newUrl.search = '?format=amp';
		return newUrl;
	},
	'medium.com': (url) => {
		// Clean up Medium URLs by removing tracking parameters
		const newUrl = new URL(url.href);
		newUrl.searchParams.delete('source');
		newUrl.searchParams.delete('gi');
		newUrl.searchParams.delete('sk');
		return newUrl;
	},

	// Developer platforms (non-social aspects)
	'github.com': (url) => {
		// GitHub: For markdown files, get the raw content
		if (url.pathname.includes('/blob/') && url.pathname.endsWith('.md')) {
			return new URL(url.href.replace('/blob/', '/raw/'));
		}
		return url;
	},
	'gitlab.com': (url) => {
		// GitLab: For markdown files, get the raw content
		if (url.pathname.includes('/blob/') && url.pathname.endsWith('.md')) {
			return new URL(url.href.replace('/blob/', '/raw/'));
		}
		return url;
	},

	// Knowledge platforms
	'wikipedia.org': (url) => {
		// Wikipedia: Use mobile version for cleaner layout
		const newUrl = new URL(url.href);
		newUrl.hostname = newUrl.hostname.replace('en.wikipedia.org', 'm.wikipedia.org');
		return newUrl;
	},

	// Korean platforms
	'blog.naver.com': (url) => {
		// Naver Blog: Use mobile version for better content extraction
		// Convert https://blog.naver.com/username/postid to https://m.blog.naver.com/username/postid
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.blog.naver.com';
		return newUrl;
	},
	'cafe.naver.com': (url) => {
		// Naver Cafe: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.cafe.naver.com';
		return newUrl;
	},
	'post.naver.com': (url) => {
		// Naver Post: Use mobile version
		const newUrl = new URL(url.href);
		newUrl.hostname = 'm.post.naver.com';
		return newUrl;
	},
	'stackoverflow.com': (url) => {
		// Stack Overflow: Keep original, it's usually accessible
		return url;
	},

	// Other platforms
	'notion.so': (url) => {
		// Notion: Keep original, usually accessible
		return url;
	},
	'hackernews.com': (url) => {
		// Hacker News: Keep original
		return url;
	},
	'news.ycombinator.com': (url) => {
		// Y Combinator Hacker News: Keep original
		return url;
	},
	'patreon.com': (url) => {
		// Patreon: Keep original for posts
		return url;
	},
	'ko-fi.com': (url) => {
		// Ko-fi: Keep original
		return url;
	},
	'buymeacoffee.com': (url) => {
		// Buy Me a Coffee: Keep original
		return url;
	},
	'gumroad.com': (url) => {
		// Gumroad: Keep original
		return url;
	},
	'itch.io': (url) => {
		// Itch.io: Keep original
		return url;
	},
	'deviantart.com': (url) => {
		// DeviantArt: Keep original
		return url;
	},
	'artstation.com': (url) => {
		// ArtStation: Keep original
		return url;
	},
	'behance.net': (url) => {
		// Behance: Keep original
		return url;
	},
	'dribbble.com': (url) => {
		// Dribbble: Keep original
		return url;
	},
	'figma.com': (url) => {
		// Figma: Keep original for public files
		return url;
	},
	'canva.com': (url) => {
		// Canva: Keep original for public designs
		return url;
	},
	'unsplash.com': (url) => {
		// Unsplash: Keep original
		return url;
	},
	'pexels.com': (url) => {
		// Pexels: Keep original
		return url;
	},
	'pixabay.com': (url) => {
		// Pixabay: Keep original
		return url;
	},
	'shutterstock.com': (url) => {
		// Shutterstock: Keep original
		return url;
	},
	'gettyimages.com': (url) => {
		// Getty Images: Keep original
		return url;
	},
	'imgur.com': (url) => {
		// Imgur: Keep original
		return url;
	},
	'flickr.com': (url) => {
		// Flickr: Keep original
		return url;
	},
	'photobucket.com': (url) => {
		// Photobucket: Keep original
		return url;
	},
	'dropbox.com': (url) => {
		// Dropbox: For shared files, keep original
		return url;
	},
	'drive.google.com': (url) => {
		// Google Drive: For shared files, keep original
		return url;
	},
	'onedrive.live.com': (url) => {
		// OneDrive: For shared files, keep original
		return url;
	},
	'box.com': (url) => {
		// Box: For shared files, keep original
		return url;
	},
	'wetransfer.com': (url) => {
		// WeTransfer: Keep original
		return url;
	},
	'sendspace.com': (url) => {
		// SendSpace: Keep original
		return url;
	},
	'mediafire.com': (url) => {
		// MediaFire: Keep original
		return url;
	},
	'mega.nz': (url) => {
		// Mega: Keep original
		return url;
	},
	'archive.org': (url) => {
		// Internet Archive: Keep original
		return url;
	},
	'web.archive.org': (url) => {
		// Wayback Machine: Keep original
		return url;
	},
	'scholar.google.com': (url) => {
		// Google Scholar: Keep original
		return url;
	},
	'researchgate.net': (url) => {
		// ResearchGate: Keep original
		return url;
	},
	'academia.edu': (url) => {
		// Academia.edu: Keep original
		return url;
	},
	'jstor.org': (url) => {
		// JSTOR: Keep original
		return url;
	},
	'pubmed.ncbi.nlm.nih.gov': (url) => {
		// PubMed: Keep original
		return url;
	},
	'arxiv.org': (url) => {
		// arXiv: Keep original
		return url;
	},
	'biorxiv.org': (url) => {
		// bioRxiv: Keep original
		return url;
	},
	'medrxiv.org': (url) => {
		// medRxiv: Keep original
		return url;
	},
	'ssrn.com': (url) => {
		// SSRN: Keep original
		return url;
	},
	'doi.org': (url) => {
		// DOI: Keep original
		return url;
	},
	'orcid.org': (url) => {
		// ORCID: Keep original
		return url;
	},
	'goodreads.com': (url) => {
		// Goodreads: Keep original
		return url;
	},
	'bookdepository.com': (url) => {
		// Book Depository: Keep original
		return url;
	},
	'amazon.com': (url) => {
		// Amazon: For book/product pages, keep original
		return url;
	},
	'amazon.co.uk': (url) => {
		// Amazon UK: Keep original
		return url;
	},
	'amazon.de': (url) => {
		// Amazon Germany: Keep original
		return url;
	},
	'amazon.fr': (url) => {
		// Amazon France: Keep original
		return url;
	},
	'amazon.es': (url) => {
		// Amazon Spain: Keep original
		return url;
	},
	'amazon.it': (url) => {
		// Amazon Italy: Keep original
		return url;
	},
	'amazon.ca': (url) => {
		// Amazon Canada: Keep original
		return url;
	},
	'amazon.com.au': (url) => {
		// Amazon Australia: Keep original
		return url;
	},
	'amazon.co.jp': (url) => {
		// Amazon Japan: Keep original
		return url;
	},
	'ebay.com': (url) => {
		// eBay: Keep original
		return url;
	},
	'etsy.com': (url) => {
		// Etsy: Keep original
		return url;
	},
	'aliexpress.com': (url) => {
		// AliExpress: Keep original
		return url;
	},
	'alibaba.com': (url) => {
		// Alibaba: Keep original
		return url;
	},
	'shopify.com': (url) => {
		// Shopify stores: Keep original
		return url;
	},
	'squarespace.com': (url) => {
		// Squarespace sites: Keep original
		return url;
	},
	'wix.com': (url) => {
		// Wix sites: Keep original
		return url;
	},
	'wordpress.com': (url) => {
		// WordPress.com sites: Keep original
		return url;
	},
	'blogger.com': (url) => {
		// Blogger: Keep original
		return url;
	},
	'blogspot.com': (url) => {
		// Blogspot: Keep original
		return url;
	},
	'tumblr.com': (url) => {
		// Tumblr: Keep original
		return url;
	},
	'ghost.org': (url) => {
		// Ghost blogs: Keep original
		return url;
	},
};

/**
 * A content handler that transforms URLs for specific domains to improve content extraction.
 * This handler focuses on general domain transformations, excluding social media and news sites
 * which are handled by specialized handlers.
 */
@Injectable()
export class DomainSpecificHandler implements IContentHandler {
	private readonly logger = new Logger(DomainSpecificHandler.name);

	/**
	 * Determines if the handler can process the content from the given URL.
	 * @param url - The URL to be checked.
	 * @returns `true` if the handler can process the URL, `false` otherwise.
	 */
	public canHandle(url: URL): boolean {
		return Object.keys(DOMAIN_TRANSFORMATIONS).some((domain) => url.hostname.endsWith(domain));
	}

	/**
	 * Processes the content from the URL by transforming it to a more accessible version.
	 * @param url - The URL of the content to handle.
	 * @returns A `PreHandleResult` with the new URL, or `null` on failure.
	 */
	public handle(url: URL): Promise<PreHandleResult | null> {
		const domain = Object.keys(DOMAIN_TRANSFORMATIONS).find((d) => url.hostname.endsWith(d));

		if (!domain) {
			return Promise.resolve(null);
		}

		try {
			const transform = DOMAIN_TRANSFORMATIONS[domain];
			const newUrl = transform(url);

			// Extract title and content from the original URL for specific domains
			let title: string | undefined;
			let content: string | undefined;
			const contentType = 'text/html'; // Default content type

			if (domain === 'substack.com') {
				title = this.extractSubstackTitle(url);
			} else if (domain === 'github.com') {
				title = this.extractGitHubTitle(url);
			} else if (domain === 'stackoverflow.com') {
				title = this.extractStackOverflowTitle(url);
			} else if (domain === 'wikipedia.org') {
				title = this.extractWikipediaTitle(url);
			}

			return Promise.resolve({
				url: newUrl.href,
				title,
				content,
				contentType,
			});
		} catch (error) {
			this.logger.warn(`DomainSpecificHandler failed for ${url.href}: ${(error as Error).message}`);
			return Promise.resolve(null);
		}
	}

	/**
	 * Extracts title from Substack URL.
	 * @param url - The Substack URL.
	 * @returns The extracted title or undefined.
	 */
	private extractSubstackTitle(url: URL): string | undefined {
		const pathParts = url.pathname.split('/').filter((part) => part.length > 0);

		if (pathParts.length > 0 && pathParts[0] === 'p') {
			// Substack post URL: /p/article-title
			const articleSlug = pathParts[1];
			if (articleSlug) {
				return articleSlug
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
			}
		}

		return undefined;
	}

	/**
	 * Extracts title from GitHub URL.
	 * @param url - The GitHub URL.
	 * @returns The extracted title or undefined.
	 */
	private extractGitHubTitle(url: URL): string | undefined {
		const pathParts = url.pathname.split('/').filter((part) => part.length > 0);

		if (pathParts.length >= 2) {
			const owner = pathParts[0];
			const repo = pathParts[1];

			if (pathParts.length >= 4 && pathParts[2] === 'blob') {
				// File URL: /owner/repo/blob/branch/path/to/file.md
				const fileName = pathParts[pathParts.length - 1];
				return `${owner}/${repo}: ${fileName}`;
			} else {
				// Repository URL: /owner/repo
				return `${owner}/${repo}`;
			}
		}

		return undefined;
	}

	/**
	 * Extracts title from Stack Overflow URL.
	 * @param url - The Stack Overflow URL.
	 * @returns The extracted title or undefined.
	 */
	private extractStackOverflowTitle(url: URL): string | undefined {
		const pathParts = url.pathname.split('/').filter((part) => part.length > 0);

		if (pathParts.length >= 3 && pathParts[0] === 'questions') {
			// Stack Overflow question URL: /questions/123456/question-title
			const titleSlug = pathParts[2];
			if (titleSlug) {
				return titleSlug
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ');
			}
		}

		return undefined;
	}

	/**
	 * Extracts title from Wikipedia URL.
	 * @param url - The Wikipedia URL.
	 * @returns The extracted title or undefined.
	 */
	private extractWikipediaTitle(url: URL): string | undefined {
		const pathParts = url.pathname.split('/').filter((part) => part.length > 0);

		if (pathParts.length >= 2 && pathParts[0] === 'wiki') {
			// Wikipedia article URL: /wiki/Article_Title
			const articleTitle = pathParts[1];
			if (articleTitle) {
				return decodeURIComponent(articleTitle.replace(/_/g, ' '));
			}
		}

		return undefined;
	}
}
